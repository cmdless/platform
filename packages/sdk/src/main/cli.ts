import { Command } from "commander";
import { CmdlessConfig, ProtocolDefinition } from "../shared/index.js";
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./mcp.js";

async function readJsonBody(request: IncomingMessage) {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function startStdioMcpServer(server: ReturnType<typeof createMcpServer>) {
  const transport = new StdioServerTransport();
  const closed = new Promise<void>((resolve) => {
    server.server.onclose = resolve;
  });

  await server.connect(transport);
  await closed;
}

function setLoopbackCorsHeaders(response: ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version");
  response.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

async function handleStreamableHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  transport: StreamableHTTPServerTransport,
  parsedBody?: unknown,
) {
  setLoopbackCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "POST") {
    const body = parsedBody ?? await readJsonBody(request);
    const sessionId = request.headers["mcp-session-id"];

    if (!sessionId && body !== undefined && !isInitializeRequest(body)) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      }));
      return;
    }

    await transport.handleRequest(request, response, body);
    return;
  }

  if (request.method === "GET") {
    await transport.handleRequest(request, response);
    return;
  }

  response.writeHead(405, { allow: "GET, POST, OPTIONS" });
  response.end();
}

async function startStreamableHttpMcpServer(createMcpServerInstance: () => ReturnType<typeof createMcpServer>) {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (request, response) => {
    try {
      if (!request.url || new URL(request.url, "http://127.0.0.1").pathname !== "/mcp") {
        setLoopbackCorsHeaders(response);
        response.writeHead(404);
        response.end();
        return;
      }

      const sessionIdHeader = request.headers["mcp-session-id"];
      const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport && request.method === "POST") {
        const body = await readJsonBody(request);

        if (!sessionId && body !== undefined && isInitializeRequest(body)) {
          const initializedTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (initializedSessionId) => {
              transports.set(initializedSessionId, initializedTransport);
            },
          });

          initializedTransport.onclose = () => {
            const currentSessionId = initializedTransport.sessionId;
            if (currentSessionId) {
              transports.delete(currentSessionId);
            }
          };

          await createMcpServerInstance().connect(initializedTransport);
          await handleStreamableHttpRequest(request, response, initializedTransport, body);
          return;
        }

        if (!transport) {
          setLoopbackCorsHeaders(response);
          response.writeHead(400, { "content-type": "application/json" });
          response.end(JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Bad Request: No valid session ID provided",
            },
            id: null,
          }));
          return;
        }
      }

      if (!transport) {
        setLoopbackCorsHeaders(response);
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        }));
        return;
      }

      await handleStreamableHttpRequest(request, response, transport);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!response.headersSent) {
        setLoopbackCorsHeaders(response);
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        }));
      }
    }
  });

  const close = async () => {
    await Promise.allSettled(
      Array.from(transports.values(), (transport) => transport.close()),
    );
    httpServer.close();
  };

  process.once("disconnect", () => {
    void close();
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine local MCP server address.");
  }

  return `http://127.0.0.1:${address.port}/mcp`;
}

function waitForChildExit(child: ChildProcess) {
  return new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`UI child process exited via signal ${signal}.`));
        return;
      }

      resolve(code ?? 0);
    });
  });
}

export function createCli<TProtocol extends ProtocolDefinition>(
  config: CmdlessConfig,
  protocol: TProtocol,
) {
  const createServer = () => createMcpServer(protocol);
  const program = new Command('app');

  program.command("ui").description("Open the desktop UI for this application")
    .option("--url [url]", "Override file loaded into electron browser window")
    .action(async ({ url }) => {
      const renderer = url ? url : new URL(config.renderer, config.root).href;
      const sdkEntryPath = fileURLToPath(new URL("../sdk.js", import.meta.url));

      const child = spawn(process.execPath, [sdkEntryPath, "--url", renderer], {
        stdio: "inherit",
        env: process.env,
      });

      process.on("SIGINT", () => {
        child.kill("SIGINT");
      });

      process.on("SIGTERM", () => {
        child.kill("SIGTERM");
      });

      process.exitCode = await waitForChildExit(child);
    });

  program.command("mcp").description("Start MCP over stdio, or websocket if stdio[3] is ipc")
    .action(async () => {
      if (process.send) {
        const url = await startStreamableHttpMcpServer(createServer);
        process.send({ type: "cmdless:mcp-url", url });
        return;
      }

      await startStdioMcpServer(createServer());
    });

  program.command("tool").description("Invoke a protocol command as a tool")
    .argument("<name>", "Tool name")
    .argument("[json]", "JSON params")
    .action(async (name, json) => {
      const item = protocol[name as keyof TProtocol];
      if (!item) throw new Error(`Unknown tool: ${name}`);

      const rawParams = json ? JSON.parse(json) : undefined;
      const params = item.input ? item.input.parse(rawParams ?? {}) : undefined;
      const result = item.input ? await item.handler(params as never) : await item.handler();
      const parsedResult = item.output ? item.output.parse(result) : result;

      if (parsedResult !== undefined) {
        console.log(JSON.stringify(parsedResult, null, 2));
      }
    });

  return program;
}
