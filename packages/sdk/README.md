# `@cmdless/sdk`

`@cmdless/sdk` is the developer-facing package for building Cmdless apps.

It gives an app:

- a protocol-first main-side API
- a renderer-side client bridge
- CLI commands
- MCP transport
- an Electron host/runtime layer

## Install

```bash
npm install @cmdless/sdk
```

## Package Shape

An app package is expected to provide a `cmdless` config block in `package.json`:

```json
{
  "cmdless": {
    "main": "./dist/main/bin.js",
    "mainDev": "./src/main/bin.ts",
    "renderer": "./dist/renderer/index.html"
  }
}
```

Fields:

- `main`: built app main entry
- `mainDev`: development-time app main entry, typically TypeScript
- `renderer`: built renderer entry HTML

The SDK also derives:

- `name` from `package.json`
- `root` from the package location
- `url` from the module that created the config

## Main-Side API

Main-side imports come from `@cmdless/sdk/main`.

Current core shape:

```ts
import { createApp } from "@cmdless/sdk/main";
import { createConfig, createProtocol } from "@cmdless/sdk/shared";

const config = createConfig({
  name: "@example/app",
  main: "./dist/main/bin.js",
  mainDev: "./src/main/bin.ts",
  renderer: "./dist/renderer/index.html",
  root: import.meta.url,
  url: import.meta.url,
});

const protocol = createProtocol(({ method, z }) => ({
  ping: method({
    output: z.object({ ok: z.boolean() }),
    async handler() {
      return { ok: true };
    },
  }),
}));

const app = createApp(config, protocol);

app.run();
```

The protocol definition is the shared source for:

- `tool` CLI execution
- MCP tool registration
- renderer-side protocol calls

## Renderer-Side API

Renderer-side imports come from `@cmdless/sdk/renderer`.

The renderer gets a `cmdless` bridge only when running inside the SDK-hosted Electron shell.

Typical usage:

```ts
import { cmdless } from "@cmdless/sdk/renderer";

const client = await cmdless.createRenderer<Protocol>(config);
const result = await client.send("ping");
```

The renderer bridge currently bootstraps by:

1. asking Electron main to create or reuse the app main process
2. receiving the app MCP endpoint URL
3. creating an MCP client
4. wrapping that in the typed protocol client

## CLI Behavior

Apps created with the SDK currently expose these built-in commands:

- `ui`
- `mcp`
- `tool`

`ui`:

- starts the shared Electron host
- downloads the configured Electron runtime if needed
- loads the renderer URL or file

`mcp`:

- starts the app protocol as MCP
- uses stdio normally
- uses a local Streamable HTTP server when spawned by the Electron host

`tool`:

- invokes one protocol method directly
- accepts JSON input for now

Schema-to-CLI argument translation is still intentionally minimal. Better `--help` output is still an active design area.

## Electron Runtime

The SDK currently manages Electron under:

```txt
~/.cmdless/runtimes/electron/{version}
```

At startup, the SDK bin:

1. reads the Electron version from the SDK package
2. ensures that runtime exists locally
3. launches the shared Electron main host

## Development Notes

Current dev behavior:

- renderer React files are handled by the Vite dev server
- TypeScript app main entries can be executed through `tsx`
- Electron preload is bundled separately into `dist/preload/index.cjs`

Current limitations:

- app main TypeScript entries are executed, but not yet fully watched/restarted
- preload is a special build artifact and should be treated as such
- CLI ergonomics are still more protocol shell than polished end-user CLI

## Template

The best reference app right now is:

- [apps/template](/Users/yakisoba/Documents/GitHub/platform/apps/template)
