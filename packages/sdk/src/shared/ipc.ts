import { CmdlessConfig } from "./protocol.js";

export type SystemPlatform =
  | "aix"
  | "android"
  | "cygwin"
  | "darwin"
  | "freebsd"
  | "haiku"
  | "linux"
  | "netbsd"
  | "openbsd"
  | "sunos"
  | "win32";

export type SystemArch =
  | "arm"
  | "arm64"
  | "ia32"
  | "loong64"
  | "mips"
  | "mipsel"
  | "ppc"
  | "ppc64"
  | "riscv64"
  | "s390"
  | "s390x"
  | "x64";

export interface ProcessSpawnRequest {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  stdin?: Uint8Array;
}

export interface ProcessSpawnResponse {
  stdout: Uint8Array;
  stderr: Uint8Array;
  exit: number;
}

export interface SystemInfoRequest {}

export interface SystemInfoResponse {
  platform: SystemPlatform;
  arch: SystemArch;
}

export interface VersionRequest {}

export interface VersionResponse {
  version: string;
}

export interface ToolCallRequest<TParams = unknown> {
  config: CmdlessConfig;
  method: string;
  params?: TParams;
}

export interface ToolCallResponse<TResult = unknown> {
  result: TResult;
}

export interface IpcApi {
  'renderer/create': {
    request: { config: CmdlessConfig; };
    response: { ok: true; };
  };
  'tools/call': {
    request: ToolCallRequest;
    response: ToolCallResponse;
  };
  version: {
    request: VersionRequest;
    response: VersionResponse;
  };
  'system/info': {
    request: SystemInfoRequest;
    response: SystemInfoResponse;
  };
  'process/spawn': {
    request: ProcessSpawnRequest;
    response: ProcessSpawnResponse;
  };
}

export type CreateRendererRequest = IpcApi['renderer/create']['request'];
export type CreateRendererResponse = IpcApi['renderer/create']['response'];

export type IpcHandler<E, K extends keyof IpcApi> = (event: E, request: IpcApi[K]["request"]) => Promise<IpcApi[K]["response"]>;
