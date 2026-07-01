import { fork, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { type CmdlessConfig, type CreateRendererResponse } from "../shared/index.js";

const rendererProcesses = new Map<string, Promise<CreateRendererResponse>>();

function getRendererProcessKey(config: CmdlessConfig) {
  return new URL(config.main, config.root).href;
}

function createTsxLaunchError(mainPath: string) {
  return new Error(
    `Cmdless could not launch the TypeScript main entry "${mainPath}". ` +
    `Install "tsx" as a devDependency in the app project so cmdless can run mainDev during local development.`
  );
}

function spawnRendererProcess(config: CmdlessConfig) {
  const mainUrl = new URL(config.main, config.root);
  const mainPath = fileURLToPath(mainUrl);
  const appRootPath = fileURLToPath(new URL(config.root));

  if (mainPath.endsWith(".ts")) {
    try {
      const requireFromRoot = createRequire(new URL("./package.json", config.root));
      requireFromRoot.resolve("tsx");
    } catch {
      throw createTsxLaunchError(mainPath);
    }

    return spawn(process.execPath, [
      "--import",
      "tsx",
      mainPath,
      "mcp",
    ], {
      cwd: appRootPath,
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
  }

  return fork(mainPath, ["mcp"], {
    cwd: appRootPath,
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
}

async function createRendererProcess(config: CmdlessConfig): Promise<CreateRendererResponse> {
  const child = spawnRendererProcess(config);

  return await new Promise<CreateRendererResponse>((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      child.removeListener("message", onMessage);
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
      callback();
    };

    const onMessage = (message: unknown) => {
      if (
        typeof message !== "object" ||
        message === null ||
        !("type" in message) ||
        !("url" in message) ||
        message.type !== "cmdless:mcp-url" ||
        typeof message.url !== "string"
      ) {
        return;
      }

      const { url } = message;
      finish(() => resolve({ url }));
    };

    const onError = (error: Error) => {
      finish(() => reject(error));
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      finish(() => {
        reject(new Error(
          `Renderer MCP process exited before reporting a websocket URL (code: ${code ?? "null"}, signal: ${signal ?? "null"}).`
        ));
      });
    };

    child.on("message", onMessage);
    child.on("error", onError);
    child.on("exit", onExit);
  });
}

export function getOrCreateRendererProcess(config: CmdlessConfig) {
  const key = getRendererProcessKey(config);
  const existing = rendererProcesses.get(key);
  if (existing) return existing;

  const created = createRendererProcess(config).catch((error) => {
    rendererProcesses.delete(key);
    throw error;
  });

  rendererProcesses.set(key, created);
  return created;
}
