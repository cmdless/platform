import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CmdlessConfig } from "../shared/index.js";

function getNodeExecPath() {
  return process.env.CMDLESS_NODE_EXEC_PATH || process.execPath;
}

function getAppRootUrl(config: CmdlessConfig) {
  const rootUrl = new URL(config.root);

  if (rootUrl.protocol === "file:") {
    return rootUrl;
  }

  return pathToFileURL(`${resolve(process.cwd())}/`);
}

function createTsxLaunchError(mainPath: string) {
  return new Error(
    `Cmdless could not launch the TypeScript main entry "${mainPath}". ` +
    `Install "tsx" as a devDependency in the app project so cmdless can run mainDev during local development.`
  );
}

export function createRendererTransport(config: CmdlessConfig) {
  const appRootUrl = getAppRootUrl(config);
  const mainUrl = new URL(config.main, appRootUrl);
  const mainPath = fileURLToPath(mainUrl);
  const appRootPath = fileURLToPath(appRootUrl);
  const nodeExecPath = getNodeExecPath();

  if (mainPath.endsWith(".ts")) {
    let tsxLoaderPath: string;

    try {
      const requireFromRoot = createRequire(new URL("./package.json", appRootUrl));
      tsxLoaderPath = requireFromRoot.resolve("tsx");
    } catch {
      throw createTsxLaunchError(mainPath);
    }

    return new StdioClientTransport({
      command: nodeExecPath,
      args: [
        "--import",
        tsxLoaderPath,
        mainPath,
        "mcp",
      ],
      cwd: appRootPath,
      env: process.env as Record<string, string>,
      stderr: "inherit",
    });
  }

  return new StdioClientTransport({
    command: nodeExecPath,
    args: [
      mainPath,
      "mcp",
    ],
    cwd: appRootPath,
    env: process.env as Record<string, string>,
    stderr: "inherit",
  });
}
