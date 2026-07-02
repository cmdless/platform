import { spawn } from "node:child_process";
import {
  type ProcessSpawnRequest,
  type ProcessSpawnResponse,
} from "../shared/ipc.js";

export async function spawnProcess(
  request: ProcessSpawnRequest,
): Promise<ProcessSpawnResponse> {
  const child = spawn(request.command, request.args ?? [], {
    env: {
      ...process.env,
      ...request.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdoutChunks: Uint8Array[] = [];
  const stderrChunks: Uint8Array[] = [];

  child.stdout?.on("data", (chunk: Buffer | string) => {
    stdoutChunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  });

  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderrChunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  });

  return await new Promise<ProcessSpawnResponse>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Process "${request.command}" exited via signal ${signal}.`));
        return;
      }

      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exit: code ?? 0,
      });
    });
  });
}
