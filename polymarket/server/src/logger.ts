type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function resolveLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? process.env.NODE_LOG_LEVEL ?? '').toLowerCase();
  if (raw === 'error' || raw === 'warn' || raw === 'info' || raw === 'debug') {
    return raw;
  }
  return 'info';
}

class Logger {
  private readonly minLevel: number;

  constructor(level: LogLevel) {
    this.minLevel = LEVEL_PRIORITY[level];
  }

  error(message?: unknown, ...optionalParams: unknown[]) {
    this.log('error', message, optionalParams);
  }

  warn(message?: unknown, ...optionalParams: unknown[]) {
    this.log('warn', message, optionalParams);
  }

  info(message?: unknown, ...optionalParams: unknown[]) {
    this.log('info', message, optionalParams);
  }

  debug(message?: unknown, ...optionalParams: unknown[]) {
    this.log('debug', message, optionalParams);
  }

  private log(level: LogLevel, message?: unknown, optionalParams: unknown[] = []) {
    if (LEVEL_PRIORITY[level] > this.minLevel) {
      return;
    }

    const target = console[level] as (message?: unknown, ...optionalParams: unknown[]) => void;
    if (typeof target === 'function') {
      target(message, ...optionalParams);
    }
  }
}

export const L = new Logger(resolveLogLevel());
