#!/usr/bin/env node
import { Command } from "commander";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };
import { ensureElectronRuntime } from "./install.js";

const program = new Command("sdk");

program
  .requiredOption("--url <url>", "Renderer URL to load into the Electron browser window");

program.parse();

const { url } = program.opts<{ url: string }>();

function waitForChildExit(child: ChildProcess) {
  return new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Electron process exited via signal ${signal}.`));
        return;
      }

      resolve(code ?? 0);
    });
  });
}

void (async () => {
  const electronVersion = packageJson.devDependencies.electron;
  const electronBinaryPath = await ensureElectronRuntime(electronVersion);
  const electronMainPath = fileURLToPath(new URL("./main/electron.js", import.meta.url));

  const child = spawn(electronBinaryPath, [electronMainPath, "--url", url], {
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
})().catch((error) => {
  console.error("Failed to start SDK runtime:", error);
  process.exitCode = 1;
});
