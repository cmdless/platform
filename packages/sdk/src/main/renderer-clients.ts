import { BrowserWindow } from "electron";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CmdlessConfig } from "../shared/index.js";
import { createRendererTransport } from "./renderer-process.js";

type RendererClientEntry = {
  client: Client;
  transport: StdioClientTransport;
};

const rendererClients = new Map<number, Map<string, Promise<RendererClientEntry>>>();
const cleanupWindows = new Set<number>();

function getAppKey(config: CmdlessConfig) {
  return `${config.name}@${config.version}`;
}

function getOrCreateWindowMap(windowId: number) {
  let windowMap = rendererClients.get(windowId);
  if (windowMap) return windowMap;

  windowMap = new Map<string, Promise<RendererClientEntry>>();
  rendererClients.set(windowId, windowMap);
  return windowMap;
}

async function closeRendererClient(entry: RendererClientEntry) {
  await entry.client.close().catch(() => { });
}

async function cleanupWindow(windowId: number) {
  const entries = rendererClients.get(windowId);
  if (!entries) return;

  rendererClients.delete(windowId);
  await Promise.allSettled(
    Array.from(entries.values(), async (entryPromise) => {
      const entry = await entryPromise;
      await closeRendererClient(entry);
    }),
  );
}

function ensureWindowCleanup(windowId: number, window: BrowserWindow) {
  if (cleanupWindows.has(windowId)) return;

  cleanupWindows.add(windowId);
  window.once("closed", () => {
    cleanupWindows.delete(windowId);
    void cleanupWindow(windowId);
  });
}

async function createRendererClientEntry(config: CmdlessConfig) {
  const transport = createRendererTransport(config);
  const client = new Client({
    name: `${config.name}-renderer`,
    version: "1.0.0",
  });

  await client.connect(transport);

  return {
    client,
    transport,
  };
}

export async function ensureRendererClient(
  window: BrowserWindow,
  config: CmdlessConfig,
) {
  const windowId = window.webContents.id;
  const appKey = getAppKey(config);
  const windowMap = getOrCreateWindowMap(windowId);

  ensureWindowCleanup(windowId, window);

  let entryPromise = windowMap.get(appKey);
  if (!entryPromise) {
    entryPromise = createRendererClientEntry(config).catch((error) => {
      windowMap.delete(appKey);
      throw error;
    });
    windowMap.set(appKey, entryPromise);
  }

  return await entryPromise;
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

export async function callRendererTool<TParams = unknown, TResult = unknown>(
  window: BrowserWindow,
  config: CmdlessConfig,
  method: string,
  params?: TParams,
) {
  const { client } = await ensureRendererClient(window, config);
  const result = await client.request(
    {
      method: "tools/call",
      params: {
        name: method,
        arguments: params,
      },
    },
    CallToolResultSchema,
  );

  return parseToolResult<TResult>(method, result);
}
