# so-vibe-ui

Embed a vibe-coding terminal into any frontend project. Press **Alt+V** to toggle a floating iframe panel with an xterm.js terminal connected to a PTY backend running your favorite CLI tools.

## Quick Start

### 1. Install

```bash
npm install so-vibe-ui
```

### 2. Start the terminal server

```bash
npx so-vibe-ui server --port 3000 --command bash
```

Or run `claude` directly:

```bash
npx so-vibe-ui server --port 3000 --command claude
```

### 3. Add to your frontend project

```ts
import { VibeUI } from 'so-vibe-ui';

const vibe = new VibeUI({
  url: 'http://localhost:3000', // your so-vibe-ui server
});

// Press Alt+V to toggle, or:
vibe.toggle();
```

## Development

### Build

```bash
npm run build
```

This runs three steps: terminal web app → SDK → Server. Output lands in `dist/`.

- `dist/sdk/` — Frontend SDK (ESM + CJS + types)
- `dist/server/` — CLI + Server (ESM + types)
- `assets/` — Static terminal page served by the server

### Install locally for other projects

**npm:**

Use **`npm link`** during active development (changes reflect immediately after rebuild):

```bash
# In so-vibe-ui/
npm link

# In your frontend project
npm link so-vibe-ui
```

To unlink:

```bash
# In your frontend project
npm unlink so-vibe-ui

# In so-vibe-ui/
npm unlink -g
```

**pnpm:**

```bash
# In your frontend project
pnpm add /path/to/so-vibe-ui
```

Or link globally:

```bash
# In so-vibe-ui/
pnpm link --global .

# In your frontend project
pnpm link --global so-vibe-ui
```

**`npm pack`** to test a real install (simulates `npm publish`):

```bash
# In so-vibe-ui/
npm pack   # → so-vibe-ui-0.1.0.tgz

# In your frontend project
npm install /path/to/so-vibe-ui-0.1.0.tgz
```

Or install directly from the local path:

```bash
npm install /path/to/so-vibe-ui
```

## API

### `new VibeUI(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | `'http://localhost:3000'` | URL loaded in the iframe |
| `shortcutKey` | `string \| null` | `'Alt+V'` | Keyboard shortcut; `null` disables |
| `width` | `string` | `'70%'` | Panel width (CSS value) |
| `height` | `string` | `'80%'` | Panel height (CSS value) |
| `zIndex` | `number` | `99999` | z-index of the overlay |
| `animate` | `boolean` | `true` | CSS transition on show/hide |
| `sandbox` | `string` | `'allow-scripts allow-forms allow-same-origin'` | iframe sandbox |
| `ignoreWhenFocused` | `boolean` | `true` | Skip shortcut when in input/textarea |
| `triggerButton` | `boolean` | `true` | Show floating toggle button (draggable, edge-snapping) |
| `triggerPosition` | `string` | `'bottom-right'` | Button position: `'bottom-right'` \| `'bottom-left'` \| `'top-right'` \| `'top-left'` |
| `onOpen` | `() => void` | - | Called when panel opens |
| `onClose` | `() => void` | - | Called when panel closes |
| `onReady` | `() => void` | - | Called when terminal WebSocket connects |
| `onError` | `(err: Error) => void` | - | Called on errors |

### Instance Methods

- `vibe.open()` — Show the panel
- `vibe.close()` — Hide the panel
- `vibe.toggle()` — Toggle visibility
- `vibe.destroy()` — Remove overlay and all listeners
- `vibe.send(data: string)` — Send a command to the terminal

### Server CLI

```bash
npx so-vibe-ui server [options]
```

| Option | Env Variable | Default | Description |
|--------|-------------|---------|-------------|
| `-p, --port <number>` | `VIBE_PORT` | `3000` | Server port |
| `-H, --host <string>` | `VIBE_HOST` | `127.0.0.1` | Bind host (use `0.0.0.0` for LAN access) |
| `-c, --command <string>` | `VIBE_COMMAND` | `$SHELL` | Command to run in PTY |
| `-w, --cwd <path>` | `VIBE_CWD` | cwd | Working directory |
| `--allowed-origins <list>` | `VIBE_ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |
| `--cols <number>` | - | `80` | Initial terminal columns |
| `--rows <number>` | - | `24` | Initial terminal rows |

### Server Programmatic API

```ts
import { createServer } from 'so-vibe-ui/server';

const server = createServer({
  port: 3000,
  command: 'bash',
  cwd: '/home/user/projects',
});

// Graceful shutdown
process.on('SIGINT', () => server.close());
```

### Vite Plugin

Auto-starts the PTY server alongside `vite dev`, auto-stops on exit. No port conflict — auto-finds a free port.

```ts
// vite.config.ts
import { vibeUIPlugin } from 'so-vibe-ui/vite-plugin';

export default defineConfig({
  plugins: [
    vibeUIPlugin({
      // port: 3000,       // optional — auto-finds free port if omitted
      host: '0.0.0.0',     // LAN accessible
      command: 'bash',     // PTY command
    }),
  ],
});
```

## Features

- **Framework agnostic** — Works with React, Vue, Angular, vanilla JS
- **Floating panel** — Draggable title bar, resizable from corner
- **Floating trigger button** — Draggable, edge-snapping, position saved to localStorage
- **Session persistence** — Refresh the page and reconnect to the same PTY session (30s grace period)
- **Mobile toolbar** — On-screen shortcut keys (Esc, Tab, Ctrl, arrows, symbols) for touch devices
- **Custom scrollbar** — Thin when idle, expands on hover/scroll for easy grabbing
- **Dark theme** — OLED dark palette (Slate + Green accent) with JetBrains Mono font
- **Keyboard shortcut** — Alt+V toggles, configurable
- **postMessage bridge** — Host page can send commands to the terminal
- **PTY backend** — Real pseudo-terminal via node-pty + WebSocket
- **Multi-session** — Each browser tab gets its own isolated PTY
- **Zero SDK dependencies** — The frontend SDK has no runtime deps

## Architecture

```
Host Page (any framework)
  └─ so-vibe-ui SDK (Alt+V → floating iframe)
       └─ iframe → xterm.js Terminal
            └─ WebSocket → so-vibe-ui Server
                 └─ node-pty → bash / claude / ...
```

## License

MIT
