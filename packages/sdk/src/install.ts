import { downloadArtifact } from "@electron/get";
import extract from "extract-zip";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir, platform as getPlatform } from "node:os";
import { join } from "node:path";

function resolveElectronVersion(version: string) {
  return version.replace(/^[^\d]*/, "");
}

function resolveRuntimeRoot(version: string) {
  return join(homedir(), ".cmdless", "runtimes", "electron", version);
}

function resolvePlatform() {
  return process.env.npm_config_platform || getPlatform();
}

function resolveArch(platform: string) {
  let arch = process.env.npm_config_arch || process.arch;

  if (
    platform === "darwin" &&
    process.platform === "darwin" &&
    arch === "x64" &&
    process.env.npm_config_arch === undefined
  ) {
    try {
      const output = execFileSync("sysctl", ["-in", "sysctl.proc_translated"], {
        encoding: "utf8",
      });

      if (output.trim() === "1") {
        arch = "arm64";
      }
    } catch {
      // Ignore failure and keep the default architecture.
    }
  }

  return arch;
}

function resolveBinaryRelativePath(platform: string) {
  switch (platform) {
    case "mas":
    case "darwin":
      return "Electron.app/Contents/MacOS/Electron";
    case "freebsd":
    case "openbsd":
    case "linux":
      return "electron";
    case "win32":
      return "electron.exe";
    default:
      throw new Error(`Electron builds are not available on platform: ${platform}`);
  }
}

function resolveBinaryPath(version: string, platform: string) {
  return join(resolveRuntimeRoot(version), resolveBinaryRelativePath(platform));
}

export async function ensureElectronRuntime(version: string) {
  const resolvedVersion = resolveElectronVersion(version);
  const platform = resolvePlatform();
  const arch = resolveArch(platform);
  const runtimeRoot = resolveRuntimeRoot(resolvedVersion);
  const electronBinaryPath = resolveBinaryPath(resolvedVersion, platform);

  if (existsSync(electronBinaryPath)) {
    return electronBinaryPath;
  }

  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(runtimeRoot, { recursive: true });

  const zipPath = await downloadArtifact({
    version: resolvedVersion,
    artifactName: "electron",
    platform,
    arch,
  });

  await extract(zipPath, { dir: runtimeRoot });
  await writeFile(join(runtimeRoot, ".arch"), arch);
  await writeFile(join(runtimeRoot, ".platform"), platform);

  if (!existsSync(electronBinaryPath)) {
    throw new Error(`Electron binary was not found after extraction: ${electronBinaryPath}`);
  }

  return electronBinaryPath;
}
