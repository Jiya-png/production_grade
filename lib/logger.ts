type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const MIN_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL as LogLevel] || LOG_LEVELS.info;

function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;
  let output = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (context) {
    output += ` | ${JSON.stringify(context)}`;
  }
  if (error) {
    output += ` | Error: ${error}`;
  }
  return output;
}

export const logger = {
  debug: (message: string, context?: Record<string, any>) => {
    if (LOG_LEVELS.debug >= MIN_LEVEL) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        context
      };
      console.log(formatLog(entry));
    }
  },

  info: (message: string, context?: Record<string, any>) => {
    if (LOG_LEVELS.info >= MIN_LEVEL) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        context
      };
      console.log(formatLog(entry));
    }
  },

  warn: (message: string, context?: Record<string, any>) => {
    if (LOG_LEVELS.warn >= MIN_LEVEL) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        context
      };
      console.warn(formatLog(entry));
    }
  },

  error: (message: string, error?: Error | string, context?: Record<string, any>) => {
    if (LOG_LEVELS.error >= MIN_LEVEL) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        context,
        error: typeof error === 'string' ? error : error?.message
      };
      console.error(formatLog(entry));
    }
  }
};
