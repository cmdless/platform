#!/usr/bin/env node
import { createServer } from 'vite';
import { spawn } from 'node:child_process';

async function run() {
  // spin up the vite server
  const server = await createServer();
  await server.listen();

  // resolve a local url for vite
  const { resolvedUrls } = server;
  const viteUrl = resolvedUrls?.local?.[0] ?? resolvedUrls?.network?.[0];
  if (!viteUrl) throw new Error("Vite dev server started, but no URL was resolved.");

  // run with resolved local url
  const child = spawn("node", ["./dist/main/bin.js", "ui", "--url", viteUrl], {
    cwd: new URL("../", import.meta.url),
    stdio: "inherit",
    env: process.env,
  });

  const closeServer = async () => {
    await server.close();
  };

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });

  try {
    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (signal) {
          reject(new Error(`UI process exited via signal ${signal}.`));
          return;
        }

        resolve(code ?? 0);
      });
    });

    await closeServer();
    process.exit(exitCode);
  } catch (error) {
    await closeServer();
    throw error;
  }
}

await run();
