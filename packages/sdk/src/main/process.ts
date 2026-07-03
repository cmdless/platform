import { spawn } from "node:child_process";
import {
  type ProcessSpawnRequest,
  type ProcessSpawnResponse,
} from "../shared/ipc.js";

export async function spawnProcess(
  request: ProcessSpawnRequest,
): Promise<ProcessSpawnResponse> {
  const hasStdin = !!request.stdin?.length;
  const child = spawn(request.command, request.args ?? [], {
    env: {
      ...process.env,
      ...request.env,
    },
    stdio: [hasStdin ? "pipe" : "ignore", "pipe", "pipe"],
  });

  const stdoutChunks: Uint8Array[] = [];
  const stderrChunks: Uint8Array[] = [];

  child.stdout?.on("data", (chunk: Buffer | string) => {
    stdoutChunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  });

  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderrChunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  });

  if (request.stdin?.length) {
    child.stdin?.end(Buffer.from(request.stdin));
  }

  return await new Promise<ProcessSpawnResponse>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Process "${request.command}" exited via signal ${signal}.`));
        return;
      }

      resolve({
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks),
        exit: code ?? 0,
      });
    });
  });
}
