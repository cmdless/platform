import { CmdlessConfig } from "./protocol.js";

export interface ProcessSpawnRequest {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ProcessSpawnResponse {
  stdout: string;
  stderr: string;
  exit: number;
}

export interface IpcApi {
  'renderer/create': {
    request: { config: CmdlessConfig; };
    response: { url: string; };
  };
  'process/spawn': {
    request: ProcessSpawnRequest;
    response: ProcessSpawnResponse;
  };
}

export type CreateRendererRequest = IpcApi['renderer/create']['request'];
export type CreateRendererResponse = IpcApi['renderer/create']['response'];

export type IpcHandler<E, K extends keyof IpcApi> = (event: E, request: IpcApi[K]["request"]) => Promise<IpcApi[K]["response"]>;
