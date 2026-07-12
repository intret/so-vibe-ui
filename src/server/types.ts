export interface VibeServerConfig {
  port?: number;
  host?: string;
  command?: string;
  shellArgs?: string[];
  cwd?: string;
  cols?: number;
  rows?: number;
  allowedOrigins?: string[];
  terminalAppPath?: string;
  pingInterval?: number;
}
