# Cmdless Platform

Cmdless is a local app foundation for tools that want one protocol surface and multiple ways to use it.

A Cmdless app can expose the same functionality through:

- a CLI
- an MCP server
- an Electron UI
- a typed renderer-side client inside that UI

The current monorepo is centered around `@cmdless/sdk` plus a working template app in [apps/template](/Users/yakisoba/Documents/GitHub/platform/apps/template).

## What You Get

With the SDK, an app defines:

- a main-side protocol
- a renderer
- a small `cmdless` config in `package.json`

From that, the platform can provide:

- `tool` execution from the terminal
- MCP over stdio or local HTTP transport
- an Electron host that downloads and manages its own Electron runtime
- a preload bridge that lets the renderer call the same protocol

## App Modes

There are two useful modes today:

- `CLI + MCP`
- `CLI + MCP + UI`

That means the same app package can be useful even if you never open the Electron shell.

## Minimal Shape

An app package currently looks like this:

```txt
my-app/
  package.json
  src/
    main/
      app.ts
      bin.ts
    renderer/
      main.tsx
      App.tsx
    shared/
      config.ts
      client.ts
```

Its `package.json` carries a `cmdless` block that tells the SDK where the app main and renderer live:

```json
{
  "cmdless": {
    "main": "./dist/main/bin.js",
    "mainDev": "./src/main/bin.ts",
    "renderer": "./dist/renderer/index.html"
  }
}
```

## Current Workflow

The current happy path is:

1. Define a protocol on the main side with `createProtocol(...)` or a plain protocol object.
2. Wrap it with `createApp(...)`.
3. Build the renderer with Vite.
4. Let the SDK handle Electron runtime setup and preload wiring.

For a concrete example, see:

- [packages/sdk/README.md](/Users/yakisoba/Documents/GitHub/platform/packages/sdk/README.md)
- [apps/template/README.md](/Users/yakisoba/Documents/GitHub/platform/apps/template/README.md)

## Current Status

The import surfaces and end-to-end runtime loop are now solid enough to document, but some ergonomics are still evolving.

Current rough edges include:

- prettier generated `--help` output from protocol schemas
- better main-process dev watch/restart behavior
- cleaner CLI/runtime layering inside the SDK

## Packages

- [packages/sdk/README.md](/Users/yakisoba/Documents/GitHub/platform/packages/sdk/README.md): SDK package usage and runtime behavior
- [apps/template/README.md](/Users/yakisoba/Documents/GitHub/platform/apps/template/README.md): starter app template
- [ARCHITECTURE.md](/Users/yakisoba/Documents/GitHub/platform/ARCHITECTURE.md): future ideas and notes that are not stable enough to present as primary docs
