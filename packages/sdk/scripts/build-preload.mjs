#!/usr/bin/env node
import { build } from "esbuild";

await build({
  entryPoints: ["./src/preload-entry.ts"],
  outfile: "./dist/preload/index.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
});
