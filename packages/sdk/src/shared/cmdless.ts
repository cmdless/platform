import type {
  CmdlessConfig,
  IpcApi,
  ProtocolClient,
  ProtocolDefinition,
  SystemInfoResponse,
} from "./index.js";

export type Cmdless = {
  createRenderer<TProtocol extends ProtocolDefinition>(
    config: CmdlessConfig,
  ): Promise<ProtocolClient<TProtocol>>;
  version(): Promise<string>;
  timeout(ms: number): Promise<void>;
  delay<T>(action: Promise<T>, ms?: number): Promise<T>;
  systemInfo(): Promise<SystemInfoResponse>;
  invoke<K extends keyof IpcApi>(
    channel: K,
    request: IpcApi[K]["request"],
  ): Promise<IpcApi[K]["response"]>;
};
