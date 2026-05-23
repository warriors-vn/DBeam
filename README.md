# DBeam — Phase 3 Desktop Runtime

Phase 3 upgrades DBeam from a browser app + localhost bridge into a **Tauri-first native desktop database IDE**.

## What changed

- **No localhost Express bridge** in the main app flow
- **Native IPC** via Tauri commands/events
- **Local connection metadata storage** through the desktop store abstraction
- **OS keychain-backed credentials** through the Rust runtime
- **Native window controls** and multi-window query entrypoints
- **Desktop-oriented workspace persistence** for tabs and preferences
- **Schema explorer + query execution** routed through native services

## Frontend architecture

```text
React + TypeScript + Vite
        ↓
Desktop service adapters (`src/services/*`)
        ↓
Tauri commands / desktop events
        ↓
Rust state + secure storage + MySQL pool management
```

## Native runtime layout

```text
src-tauri/
  src/
    commands/
    db/
    models/
    security/
    services/
    state/
    utils/
```

## Current runtime responsibilities

- `src/services/bridge.ts`
  - Native invoke/event adapter
  - Browser-preview fallback for UI-only work
- `src/stores/connections.ts`
  - Saved connection metadata + active native session state
- `src/stores/tabs.ts`
  - Persisted query/table tabs
- `src/services/persistence.ts`
  - Preferences and workspace persistence abstraction
- `src-tauri/src/commands/mod.rs`
  - Tauri commands for connections, schema, queries, exports, and windows
- `src-tauri/src/db/mysql.rs`
  - MySQL pool/test/query/schema logic
- `src-tauri/src/security/keychain.rs`
  - OS credential storage
- `src-tauri/src/state/mod.rs`
  - Shared runtime state and active sessions

## Validated locally in this workspace

The frontend migration was validated with:

```sh
npm install
npm run typecheck
```

## Tooling status on this machine

At the time of migration, `npm` was available and used successfully.
Rust/Tauri toolchains were **not installed** on this machine yet, so the Rust desktop runtime files were scaffolded carefully but could not be compiled locally here.

## To run once Rust/Tauri tooling is available

```sh
npm install
npm run dev
npm run dev:desktop
```

## To build the desktop app once Rust is installed

```sh
npm run build
npm run build:desktop
```

## Recommended next steps

1. Install the Rust toolchain and Tauri prerequisites.
2. Compile and iterate on `src-tauri`.
3. Add cancellation/streaming for long-running queries.
4. Add SQLite-backed local history/snippets if you want richer offline persistence.
5. Expand the driver abstraction for PostgreSQL, MongoDB, and Redis.
