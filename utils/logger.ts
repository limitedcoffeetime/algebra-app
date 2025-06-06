const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
} as const;

type LogLevel = keyof typeof LEVELS;

// Safely read environment variables in both Node (process.env) and React Native (__DEV__)
// Using globalThis to avoid direct Node type dependency so that bundlers without Node typings do not complain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any)?.process?.env ?? {};

// Determine active log level. Defaults to 'debug' (dev) or 'warn' (prod)
const envLevel = (env.LOG_LEVEL as LogLevel) ?? (env.NODE_ENV === 'production' ? 'warn' : 'debug');
const activeLevel: LogLevel = envLevel in LEVELS ? envLevel : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[activeLevel] && activeLevel !== 'silent';
}

function formatPrefix(level: LogLevel): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]`;
}

function createLogger(level: LogLevel) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    if (!shouldLog(level)) return;
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(formatPrefix(level), ...args);
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(formatPrefix(level), ...args);
    } else {
      // info & debug
      // eslint-disable-next-line no-console
      console.log(formatPrefix(level), ...args);
    }
  };
}

export const logger = {
  debug: createLogger('debug'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
};