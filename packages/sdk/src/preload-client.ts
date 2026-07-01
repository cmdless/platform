import { ipcRenderer } from "electron";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
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

function resolveRendererConfig(config: CmdlessConfig): CmdlessConfig {
  const isDev = new URL(config.url).pathname.endsWith(".ts");

  return {
    ...config,
    main: isDev ? config.mainDev : config.main,
  };
}

function parseToolResult<T>(method: string, result: typeof CallToolResultSchema._output): T {
  if (result.isError) {
    const message = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n")
      .trim();

    throw new Error(message || `Tool "${method}" failed.`);
  }

  const item = result.content[0];
  if (!item) return undefined as T;
  if (item.type !== "text") {
    throw new Error(`Tool "${method}" returned unsupported non-text content.`);
  }
  if (!item.text) return undefined as T;

  return JSON.parse(item.text) as T;
}

export async function createRendererClient<TProtocol extends ProtocolDefinition>(
  config: CmdlessConfig,
) {
  const resolvedConfig = resolveRendererConfig(config);
  const { url } = await invokeIpc("renderer/create", { config: resolvedConfig });
  const client = new Client({
    name: `${resolvedConfig.name}-renderer`,
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);

  return createClient<TProtocol>(resolvedConfig, async <
    K extends keyof TProtocol & string
  >(
    method: K,
    ...args: InputOf<TProtocol[K]> extends void
      ? []
      : [params: InputOf<TProtocol[K]>]
  ): Promise<OutputOf<TProtocol[K]>> => {
    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: method,
          arguments: args[0],
        },
      },
      CallToolResultSchema,
    );

    return parseToolResult<OutputOf<TProtocol[K]>>(method, result);
  });
}
