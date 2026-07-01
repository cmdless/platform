import type { CmdlessConfig, IpcApi, ProtocolClient, ProtocolDefinition } from "./index.js";

export type Cmdless = {
  createRenderer<TProtocol extends ProtocolDefinition>(
    config: CmdlessConfig,
  ): Promise<ProtocolClient<TProtocol>>;
  invoke<K extends keyof IpcApi>(
    channel: K,
    request: IpcApi[K]["request"],
  ): Promise<IpcApi[K]["response"]>;
};
