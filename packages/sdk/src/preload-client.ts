import { ipcRenderer } from "electron";
import {
  createClient,
  type CmdlessConfig,
  type InputOf,
  type IpcApi,
  type OutputOf,
  type ProtocolDefinition,
} from "./shared/index.js";

export function invokeIpc<K extends keyof IpcApi>(
  channel: K,
  request: IpcApi[K]["request"],
): Promise<IpcApi[K]["response"]> {
  return ipcRenderer.invoke(channel, request);
}

export function getSystemInfo() {
  return invokeIpc("system/info", {});
}

function resolveRendererConfig(config: CmdlessConfig): CmdlessConfig {
  const isDev = new URL(config.url).pathname.endsWith(".ts");

  return {
    ...config,
    main: isDev ? config.mainDev : config.main,
  };
}

export async function createRendererClient<TProtocol extends ProtocolDefinition>(
  config: CmdlessConfig,
) {
  const resolvedConfig = resolveRendererConfig(config);
  const runtimeVersion = await invokeIpc("version", {});

  if (runtimeVersion.version !== resolvedConfig.sdk) {
    throw new Error(
      `Cmdless sdk version mismatch: renderer expects ${resolvedConfig.sdk}, preload provides ${runtimeVersion.version}.`,
    );
  }

  await invokeIpc("renderer/create", { config: resolvedConfig });

  return createClient<TProtocol>(resolvedConfig, async <
    K extends keyof TProtocol & string
  >(
    method: K,
    ...args: InputOf<TProtocol[K]> extends void
      ? []
      : [params: InputOf<TProtocol[K]>]
  ): Promise<OutputOf<TProtocol[K]>> => {
    const response = await invokeIpc("tools/call", {
      config: resolvedConfig,
      method,
      params: args[0],
    });

    return response.result as OutputOf<TProtocol[K]>;
  });
}
