import { CmdlessConfig } from "./protocol.js";

export interface IpcApi {
  'renderer/create': {
    request: { config: CmdlessConfig; };
    response: { url: string; };
  }
}

export type CreateRendererRequest = IpcApi['renderer/create']['request'];
export type CreateRendererResponse = IpcApi['renderer/create']['response'];

export type IpcHandler<E, K extends keyof IpcApi> = (event: E, request: IpcApi[K]["request"]) => Promise<IpcApi[K]["response"]>;