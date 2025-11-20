/**
 * Logger utility for structured logging in Cloudflare Workers
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: unknown
}

export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error | unknown, context?: LogContext): void
}

class WorkerLogger implements Logger {
  private minLevel: LogLevel

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel
  }

  private log(level: LogLevel, levelName: string, message: string, data?: LogContext | Error) {
    if (level < this.minLevel) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      ...(data instanceof Error
        ? {
            error: {
              name: data.name,
              message: data.message,
              stack: data.stack,
            },
          }
        : data),
    }

    const output = JSON.stringify(logEntry)

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output)
        break
      case LogLevel.WARN:
        console.warn(output)
        break
      case LogLevel.ERROR:
        console.error(output)
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorData = error instanceof Error ? error : undefined
    const mergedContext = {
      ...context,
      ...(errorData ? {} : { error }),
    }
    this.log(LogLevel.ERROR, 'ERROR', message, errorData || mergedContext)
  }
}

// Export singleton instance
export const logger = new WorkerLogger(
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
)

/**
 * Create a logger with a specific minimum level
 */
export function createLogger(minLevel: LogLevel = LogLevel.INFO): Logger {
  return new WorkerLogger(minLevel)
}
