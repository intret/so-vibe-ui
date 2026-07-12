# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

so-vibe-ui is an npm library that embeds a terminal emulator into any frontend project. Press Alt+V to toggle a floating, draggable iframe panel containing an xterm.js terminal connected via WebSocket to a node-pty backend.

## Build & Develop

```bash
npm run build          # Full build: terminal → SDK → server → vite-plugin
npm run build:sdk      # Frontend SDK only (tsup, ESM + CJS + DTS)
npm run build:terminal # Terminal web app only (esbuild)
npm run build:server   # Backend server only (tsup, ESM + DTS)
npm run typecheck      # tsc --noEmit
```

`node build.js` orchestrates all 4 build steps. Output: `dist/sdk/`, `dist/server/`, `dist/vite-plugin/`, `assets/`.

## Architecture

Three independent layers:

| Layer | Src | Output | Role |
|-------|-----|--------|------|
| **SDK** | `src/sdk/` | `dist/sdk/` | Browser: injects iframe overlay, Alt+V toggle, floating trigger button, postMessage bridge |
| **Terminal** | `src/terminal/` | `assets/` | xterm.js page served by server, loaded in iframe |
| **Server** | `src/server/` | `dist/server/` | Node.js: Express static serve + WebSocket + node-pty |
| **Vite Plugin** | `src/vite-plugin/` | `dist/vite-plugin/` | Auto-starts PTY server alongside vite dev |

### Data flow

```
Host Page → new VibeUI({ url }) → iframe (assets/index.html)
  → xterm.js → WebSocket /ws → node-pty → bash/claude
```

### SDK (`src/sdk/`)

- `vibe-ui.ts` — Core `VibeUI` class (singleton). Creates DOM overlay with backdrop, draggable panel, resizable handle, trigger button. Keyboard shortcut parsing, postMessage listener.
- `styles.ts` — `getStyles()` generates CSS-in-JS string injected into `<head>`. OLED dark theme (Slate + Green accent). Trigger button edge-snapping CSS.
- `constants.ts` — CSS prefix `so-vibe-ui`, default config values, class name map.
- `types.ts` — `VibeUIConfig`, `VibeMessage` interfaces.
- `index.ts` — Re-exports `VibeUI`, `createVibeUI` factory.

CSS class prefix: `so-vibe-ui-*`. postMessage sources: `'so-vibe-ui'` (host→iframe) and `'so-vibe-terminal'` (iframe→host). sessionStorage keys prefixed `so-vibe-ui-session-` and `so-vibe-ui-trigger-pos-`.

### Terminal (`src/terminal/`)

- `main.ts` — Entry: creates terminal, toolbar, connects WebSocket, reads `?session=` param.
- `terminal.ts` — xterm.js setup: Theme (Slate palette), JetBrains Mono font, FitAddon, WebLinksAddon.
- `websocket.ts` — Client WS: sends keystrokes, resize JSON `{type:"resize",cols,rows}`, receives PTY output. Intercepts `{type:"session",token,status}` JSON messages.
- `bridge.ts` — postMessage to parent: `ready`, `session` (with token+status), `error`, `close` (Shift+Escape).
- `toolbar.ts` — Mobile shortcut buttons (Esc, Tab, Ctrl latch, arrows, symbols). Appended to `#vibe-app`.

### Server (`src/server/`)

- `server.ts` — `createServer()`: Express + ws (noServer mode), CORS, origin validation, ping/pong keepalive.
- `pty-manager.ts` — PTY lifecycle: per-session spawn, 30s grace period on disconnect, output buffer (max 5000 lines), session token (UUID) for reconnection.
- `websocket.ts` — Per-connection handler: parses `?session=` query, sends `{type:"session",token,status}` on connect (status: `"new"` or `"reconnected"`), drains buffer on reconnect.
- `config.ts` — `resolveConfig()`: CLI flags > env vars > defaults.
- `cli.ts` — Commander: `so-vibe-ui [server] --port --host --command --cwd`.

### Session persistence

On page refresh, the SDK reads sessionStorage for a session token, appends `?session=xxx` to the iframe URL. The terminal passes it to the WebSocket. The server looks up the PTY by token; if found within 30s grace period, reattaches and drains buffered output. Title bar shows "↻ Reconnected" or "● Connected" for 3 seconds.

### Vite Plugin (`src/vite-plugin/`)

`vibeUIPlugin({ port?, host?, command?, cwd? })` — Auto-finds free port (starting 3000) if none specified. Spawns `dist/server/cli.js` as child process when vite dev starts, kills on close. `cwd` supports relative paths (resolved with `path.resolve()`). No vite dependency — uses a minimal local `VitePlugin` interface.

## Package exports

```json
"so-vibe-ui"           → dist/sdk/index.js   (VibeUI class)
"so-vibe-ui/server"    → dist/server/index.js (createServer)
"so-vibe-ui/vite-plugin" → dist/vite-plugin/index.js (vibeUIPlugin)
```

Bin: `so-vibe-ui` → `dist/server/cli.js`

## Publishing

```bash
npm run build && npm version patch && git push origin main --tags && npm publish
```
