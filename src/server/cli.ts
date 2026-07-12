#!/usr/bin/env node
import { Command } from 'commander';
import { createServer } from './server.js';

const program = new Command();

program
  .name('so-vibe-ui')
  .description('Start a so-vibe-ui terminal server for vibe coding')
  .option('-p, --port <number>', 'port to listen on', parseInt)
  .option('-H, --host <string>', 'host to bind to')
  .option('-c, --command <string>', 'command to run in the PTY (default: $SHELL)')
  .option('-w, --cwd <path>', 'working directory for the PTY')
  .option('--allowed-origins <list>', 'comma-separated CORS origins (default: *)')
  .option('--cols <number>', 'initial terminal columns', parseInt)
  .option('--rows <number>', 'initial terminal rows', parseInt)
  .action((options) => {
    const config: Record<string, unknown> = {};

    if (options.port) config.port = options.port;
    if (options.host) config.host = options.host;
    if (options.command) config.command = options.command;
    if (options.cwd) config.cwd = options.cwd;
    if (options.allowedOrigins) {
      config.allowedOrigins = options.allowedOrigins
        .split(',')
        .map((s: string) => s.trim());
    }
    if (options.cols) config.cols = options.cols;
    if (options.rows) config.rows = options.rows;

    const server = createServer(config);

    process.on('SIGINT', () => server.close());
    process.on('SIGTERM', () => server.close());
  });

program.parse();
