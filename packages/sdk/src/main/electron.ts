import { Command } from "commander";
import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../../package.json" with { type: "json" };
import {
  type IpcApi,
  type IpcHandler,
} from "../shared/index.js";
import { getOrCreateRendererProcess } from "./renderer-process.js";

function getElectronHostName() {
  return `cmdless-electron@${packageJson.devDependencies.electron}`;
}

function configureElectronHostIdentity() {
  const hostName = getElectronHostName();
  app.setName(hostName);
  app.setPath("userData", join(app.getPath("appData"), hostName));
}

export function handle<K extends keyof IpcApi>(
  channel: K,
  handler: IpcHandler<IpcMainInvokeEvent, K>,
) {
  ipcMain.handle(channel, handler);
}

export function setupElectronIpc() {
  handle("renderer/create", async (_, request) => {
    return await getOrCreateRendererProcess(request.config);
  });
}

function getPreloadPath() {
  return fileURLToPath(new URL("../preload/index.cjs", import.meta.url));
}

async function createMainWindow(rendererUrl: string) {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  await window.loadURL(rendererUrl);
  return window;
}

export async function runElectronApp(rendererUrl: string) {
  configureElectronHostIdentity();
  setupElectronIpc();

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow(rendererUrl);
    }
  });

  await app.whenReady();

  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow(rendererUrl);
  }
}

const program = new Command("sdk-electron-main");

program
  .requiredOption("--url <url>", "Renderer URL to load into the Electron browser window");

program.parse();

const { url } = program.opts<{ url: string }>();

void runElectronApp(url).catch((error) => {
  console.error("Failed to start Electron app:", error);
  app.quit();
});
