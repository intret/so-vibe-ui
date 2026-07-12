import type { VibeServerConfig } from './types.js';

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function resolveConfig(
  cliArgs?: Partial<VibeServerConfig>,
): Required<VibeServerConfig> {
  const port =
    cliArgs?.port ??
    parsePort(process.env.VIBE_PORT) ??
    3000;

  const host = cliArgs?.host ?? process.env.VIBE_HOST ?? '127.0.0.1';

  const command =
    cliArgs?.command ??
    process.env.VIBE_COMMAND ??
    process.env.SHELL ??
    'bash';

  const shellArgs = cliArgs?.shellArgs ?? [];

  const cwd = cliArgs?.cwd ?? process.env.VIBE_CWD ?? process.cwd();

  const cols = cliArgs?.cols ?? 80;
  const rows = cliArgs?.rows ?? 24;

  const allowedOrigins: string[] = cliArgs?.allowedOrigins ??
    (process.env.VIBE_ALLOWED_ORIGINS
      ? process.env.VIBE_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
      : ['*']);

  const terminalAppPath = cliArgs?.terminalAppPath ?? '';

  const pingInterval = cliArgs?.pingInterval ?? 30000;

  return {
    port,
    host,
    command,
    shellArgs,
    cwd,
    cols,
    rows,
    allowedOrigins,
    terminalAppPath,
    pingInterval,
  };
}
