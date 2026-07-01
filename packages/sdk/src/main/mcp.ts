import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProtocolDefinition } from "../shared/protocol.js";
import { z } from "zod";

export function createMcpServer<TProtocol extends ProtocolDefinition>(
  protocol: TProtocol
) {
  const server = new McpServer({
    name: "cmdless-app",
    version: "1.0.0",
  });

  for (const [name, { input, output, handler }] of Object.entries(protocol)) {
    server.registerTool(
      name,
      {
        title: name,
        inputSchema: input ?? z.object({}),
        outputSchema: output,
      },
      async (params) => {
        const parsedInput = input ? input.parse(params) : undefined;
        const result = input ? await handler(parsedInput) : await handler();
        const parsedResult = output ? output.parse(result) : result;
        return {
          content: [
            {
              type: "text",
              text: parsedResult === undefined
                ? ""
                : JSON.stringify(parsedResult, null, 2),
            },
          ],
        };
      }
    );
  }

  return server;
}
