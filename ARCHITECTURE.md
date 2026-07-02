# Architecture Notes

This file is for decisions, future directions, and ideas that are still useful but not stable enough to present as primary product docs.

## Current Invariants

- Cmdless is protocol-first.
- The same app main definition should be usable from:
  - CLI
  - MCP
  - renderer UI
- Electron is managed by the SDK, not by the app package directly.
- A Cmdless app should still be useful without opening an Electron UI.
- The Electron host is useful even when no Cmdless app protocol is connected.

## Runtime Storage

Current runtime storage target:

```txt
~/.cmdless/
  runtimes/
    electron/
      {electronVersion}/
```

This is already implemented for Electron runtime management.

Possible future refinements:

- separate runtime directories by platform and arch
- additional SDK-managed runtime metadata

## CLI Ergonomics

The protocol already powers direct tool execution, but the user-facing CLI shape is still intentionally rough.

Interesting future work:

- schema-to-CLI argument translation
- better `--help` output
- positional/flag generation from input schemas
- nicer text formatting for outputs and errors

## Manager / Installed-App Story

There is still room for a higher-level manager/runtime daemon story, but it is not part of the current documented happy path.

Potential future areas:

- app installation and discovery
- URI handling
- process tracking
- centralized local manager state
- installed-app execution from `cmdless://apps/...`

## Alternate Outputs

Interesting but not primary today:

- optional inline or single-file renderer outputs
- richer app-to-app access inside Cmdless
- a more explicit installed-app packaging flow
- using the Electron host as a generic desktop shell for arbitrary renderer URLs or files
- SDK-owned mini apps such as an MCP explorer or elicitation UI

## Host Capabilities

The preload-to-Electron-main bridge is now becoming its own SDK surface, separate from the app protocol.

Important implications:

- host capabilities can be used from a renderer without `createRenderer(...)`
- app protocol capabilities still belong to the app connection layer
- generic operations such as process invocation, dialogs, fetch, or shell integration belong naturally on the host bridge

Interesting future work:

- a more explicit host API surface than raw `cmdless.invoke(...)`
- streaming/progress/cancellation patterns for host requests
- bidirectional request/notification modeling for richer SDK-owned services

## Scaffold Flow

The SDK now has a `create` command that copies the local template when developing inside the monorepo and otherwise falls back to repository source.

Likely future refinements:

- more package.json transformations
- package-manager-specific install guidance
- automatic workspace/package-graph updates beyond TypeScript references
- eventually splitting the template/starter flow from the SDK runtime package if that becomes cleaner

## Development Loop Improvements

Still worth exploring:

- watch/restart for app main TS processes
- reconnecting renderer clients after main restarts
- cleaner Electron window lifecycle and external-link handling
