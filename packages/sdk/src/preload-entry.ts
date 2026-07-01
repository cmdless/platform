import { contextBridge } from "electron";
import { createRendererClient, invokeIpc } from "./preload-client.js";
import { type Cmdless } from "./shared/cmdless.js";

function create(): Cmdless {
  return {
    async createRenderer(config) {
      return await createRendererClient(config);
    },
    invoke(channel, request) {
      return invokeIpc(channel, request);
    },
  };
}

contextBridge.exposeInMainWorld("cmdless", create());
