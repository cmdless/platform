import { contextBridge } from "electron";
import { createRendererClient, getSystemInfo, invokeIpc } from "./preload-client.js";
import { type Cmdless } from "./shared/cmdless.js";
import packageJson from "../package.json" with { type: "json" };

function timeout(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function create(): Cmdless {
  return {
    async createRenderer(config) {
      return await createRendererClient(config);
    },
    async version() {
      return packageJson.version;
    },
    timeout(ms) {
      return timeout(ms);
    },
    async delay(action, ms = 500) {
      const [result] = await Promise.all([action, timeout(ms)]);
      return result;
    },
    systemInfo() {
      return getSystemInfo();
    },
    invoke(channel, request) {
      return invokeIpc(channel, request);
    },
  };
}

contextBridge.exposeInMainWorld("cmdless", create());
