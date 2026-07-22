type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const envLevel = process.env.LOG_LEVEL as LogLevel;
const currentLevel: LogLevel = envLevel in LOG_LEVELS ? envLevel : (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, component: string, message: string, data?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] [${component}] ${message}`;
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export const logger = {
  debug(component: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('debug')) console.debug(formatMessage('debug', component, message, data));
  },
  info(component: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('info')) console.info(formatMessage('info', component, message, data));
  },
  warn(component: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('warn')) console.warn(formatMessage('warn', component, message, data));
  },
  error(component: string, message: string, data?: Record<string, unknown>): void {
    if (shouldLog('error')) console.error(formatMessage('error', component, message, data));
  },
};