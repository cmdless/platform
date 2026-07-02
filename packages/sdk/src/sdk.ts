#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { ensureElectronRuntime } from "./install.js";

const TEMPLATE_REPOSITORY_TARBALL =
  "https://codeload.github.com/cmdless/platform/tar.gz/refs/heads/main";

function waitForChildExit(child: ChildProcess, name: string) {
  return new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${name} exited via signal ${signal}.`));
        return;
      }

      resolve(code ?? 0);
    });
  });
}

async function ensureEmptyDirectory(path: string) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      throw new Error(`Destination path "${path}" already exists and is not a directory.`);
    }

    const entries = await readdir(path);
    if (entries.length > 0) {
      throw new Error(`Destination directory "${path}" must be empty.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(path, { recursive: true });
      return;
    }

    throw error;
  }
}

function shouldCopyTemplateEntry(path: string) {
  const name = basename(path);
  return ![
    "dist",
    "node_modules",
    ".git",
    "package-lock.json",
    "tsconfig.tsbuildinfo",
  ].includes(name);
}

async function copyDirectoryContents(source: string, destination: string) {
  const entries = await readdir(source);

  for (const entry of entries) {
    const sourcePath = join(source, entry);
    if (!shouldCopyTemplateEntry(sourcePath)) continue;

    await cp(sourcePath, join(destination, entry), {
      recursive: true,
      force: true,
    });
  }
}

function derivePackageName(destinationPath: string, name?: string) {
  return name ?? basename(resolve(destinationPath));
}

function deriveBinName(packageName: string) {
  if (packageName.includes("/")) {
    const [, scopedName] = packageName.split("/", 2);
    return scopedName || packageName;
  }

  return packageName;
}

async function rewriteTemplatePackageJson(destinationPath: string, packageName: string) {
  const packageJsonPath = join(destinationPath, "package.json");
  const packageJsonText = await readFile(packageJsonPath, "utf8");
  const appPackageJson = JSON.parse(packageJsonText) as {
    name?: string;
    bin?: Record<string, string>;
  };

  const binName = deriveBinName(packageName);
  const binEntryPath = Object.values(appPackageJson.bin ?? {})[0] ?? "./dist/main/bin.js";

  appPackageJson.name = packageName;
  appPackageJson.bin = {
    [binName]: binEntryPath,
  };

  await writeFile(packageJsonPath, `${JSON.stringify(appPackageJson, null, 2)}\n`);
}

function getAncestorDirectories(startPath: string) {
  const ancestors: string[] = [];
  let currentPath = dirname(startPath);

  while (true) {
    ancestors.push(currentPath);

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return ancestors;
    }

    currentPath = parentPath;
  }
}

async function resolveLocalTemplateRoot() {
  const sdkEntryPath = fileURLToPath(import.meta.url);

  for (const ancestorPath of getAncestorDirectories(sdkEntryPath)) {
    const templatePackageJsonPath = join(ancestorPath, "apps", "template", "package.json");

    try {
      const packageJsonText = await readFile(templatePackageJsonPath, "utf8");
      const templatePackageJson = JSON.parse(packageJsonText) as { name?: string };

      if (templatePackageJson.name !== "@cmdless/template") continue;
      return dirname(templatePackageJsonPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return undefined;
}

async function downloadRepositoryTarball(destinationPath: string) {
  const response = await fetch(TEMPLATE_REPOSITORY_TARBALL);
  if (!response.ok) {
    throw new Error(`Failed to download template repository (${response.status} ${response.statusText}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const tempRoot = await mkdtemp(join(tmpdir(), "cmdless-template-"));
  const tarballPath = join(tempRoot, "platform.tar.gz");
  const extractPath = join(tempRoot, "extract");

  try {
    await mkdir(extractPath, { recursive: true });
    await writeFile(tarballPath, buffer);

    const child = spawn("tar", ["-xzf", tarballPath, "-C", extractPath], {
      stdio: "inherit",
      env: process.env,
    });

    const exitCode = await waitForChildExit(child, "tar");
    if (exitCode !== 0) {
      throw new Error(`tar exited with code ${exitCode}.`);
    }

    const [repositoryRoot] = await readdir(extractPath);
    if (!repositoryRoot) {
      throw new Error("Downloaded repository archive was empty.");
    }

    const templateRoot = join(extractPath, repositoryRoot, "apps", "template");
    await copyDirectoryContents(templateRoot, destinationPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function createTemplate(destination: string, name?: string) {
  const destinationPath = resolve(process.cwd(), destination);
  await ensureEmptyDirectory(destinationPath);

  const localTemplateRoot = await resolveLocalTemplateRoot();
  if (localTemplateRoot) {
    await copyDirectoryContents(localTemplateRoot, destinationPath);
  } else {
    await downloadRepositoryTarball(destinationPath);
  }

  const packageName = derivePackageName(destinationPath, name);
  await rewriteTemplatePackageJson(destinationPath, packageName);
}

async function runElectronUi(rendererUrl: string) {
  const electronVersion = packageJson.devDependencies.electron;
  const electronBinaryPath = await ensureElectronRuntime(electronVersion);
  const electronMainPath = fileURLToPath(new URL("./main/electron.js", import.meta.url));

  const child = spawn(electronBinaryPath, [electronMainPath, "--url", rendererUrl], {
    stdio: "inherit",
    env: process.env,
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });

  process.exitCode = await waitForChildExit(child, "Electron process");
}

const program = new Command("sdk");

program
  .option("--url <url>", "Renderer URL to load into the Electron browser window")
  .action(async (options: { url?: string }) => {
    if (!options.url) {
      throw new Error('Missing required option "--url <url>".');
    }

    await runElectronUi(options.url);
  });

program
  .command("create")
  .description("Create a new Cmdless app from the template package")
  .requiredOption("--path <path>", "Destination path for the new app")
  .option("--name <name>", "Package name for the generated app")
  .action(async ({ path, name }: { path: string; name?: string }) => {
    await createTemplate(path, name);
  });

void program.parseAsync(process.argv).catch((error) => {
  console.error("Failed to run SDK command:", error);
  process.exitCode = 1;
});
