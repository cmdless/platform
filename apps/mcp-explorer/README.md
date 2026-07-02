# Cmdless Template

This template is the current reference app for building with `@cmdless/sdk`.

It demonstrates:

- a main-side Cmdless app entry
- a Vite React renderer
- the `cmdless` package config block
- local development against the shared Electron host

## Structure

```txt
apps/template/
  src/
    main/
      app.ts
      bin.ts
    renderer/
      main.tsx
      App.tsx
    shared/
      client.ts
      config.ts
```

Important files:

- [src/main/app.ts](/Users/yakisoba/Documents/GitHub/platform/apps/template/src/main/app.ts:1): creates the app with `createApp(...)`
- [src/main/bin.ts](/Users/yakisoba/Documents/GitHub/platform/apps/template/src/main/bin.ts:1): starts the main-side CLI
- [src/shared/config.ts](/Users/yakisoba/Documents/GitHub/platform/apps/template/src/shared/config.ts:1): builds the Cmdless config from `package.json`
- [src/shared/client.ts](/Users/yakisoba/Documents/GitHub/platform/apps/template/src/shared/client.ts:1): creates the renderer-side Cmdless client

## Commands

- `npm run build`
  - builds main/shared TypeScript
  - builds the renderer with Vite

- `npm run dev`
  - builds the app first
  - starts a Vite dev server
  - opens the Electron shell through the SDK

## Current Dev Loop

Today, the template dev loop is best for renderer work:

- editing `src/renderer/*` should update through Vite in the Electron window
- the app main TS entry can be executed through `tsx` when launched in dev mode

Still evolving:

- automatic restart/reconnect when app main TS changes
- nicer external link handling
- more polished example protocol and CLI output

## `cmdless` Config

The template `package.json` includes:

```json
{
  "cmdless": {
    "main": "./dist/main/bin.js",
    "mainDev": "./src/main/bin.ts",
    "renderer": "./dist/renderer/index.html"
  }
}
```

This is the contract the SDK uses to decide:

- what to run in built mode
- what to run in dev mode
- what renderer entry to load in Electron
