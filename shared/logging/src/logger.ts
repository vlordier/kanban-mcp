export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  boardId?: string;
  taskId?: string;
  columnId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  component?: string;
  operation?: string;
}

export class Logger {
  private component: string;
  private minLevel: LogLevel;

  constructor(component: string, minLevel: LogLevel = LogLevel.INFO) {
    this.component = component;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.minLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const levelName = levelNames[entry.level] || 'UNKNOWN';
    
    let formatted = `[${entry.timestamp}] ${levelName} [${entry.component}]`;
    
    if (entry.operation) {
      formatted += ` ${entry.operation}:`;
    }
    
    formatted += ` ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      formatted += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error, operation?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: this.component,
      context,
      operation,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLogEntry(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
    }
  }

  public error(message: string, context?: LogContext, error?: Error, operation?: string): void {
    this.log(LogLevel.ERROR, message, context, error, operation);
  }

  public warn(message: string, context?: LogContext, operation?: string): void {
    this.log(LogLevel.WARN, message, context, undefined, operation);
  }

  public info(message: string, context?: LogContext, operation?: string): void {
    this.log(LogLevel.INFO, message, context, undefined, operation);
  }

  public debug(message: string, context?: LogContext, operation?: string): void {
    this.log(LogLevel.DEBUG, message, context, undefined, operation);
  }

  // Convenience methods for common operations
  public logOperation(operation: string, level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    this.log(level, message, context, error, operation);
  }

  public logRequest(requestId: string, method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, { requestId, ...context }, 'HTTP_REQUEST');
  }

  public logResponse(requestId: string, method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`${method} ${path} ${statusCode} (${duration}ms)`, { requestId, statusCode, duration, ...context }, 'HTTP_RESPONSE');
  }

  public logDatabaseOperation(operation: string, table: string, success: boolean, duration?: number, context?: LogContext, error?: Error): void {
    const message = `${operation} on ${table} ${success ? 'succeeded' : 'failed'}${duration ? ` (${duration}ms)` : ''}`;
    const level = success ? LogLevel.DEBUG : LogLevel.ERROR;
    this.log(level, message, { table, success, duration, ...context }, error, 'DB_OPERATION');
  }

  public logValidationError(field: string, value: any, rule: string, context?: LogContext): void {
    this.warn(`Validation failed: ${field} = ${JSON.stringify(value)} (rule: ${rule})`, { field, value, rule, ...context }, 'VALIDATION');
  }

  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', context?: LogContext): void {
    const level = severity === 'high' ? LogLevel.ERROR : severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Security event: ${event}`, { severity, ...context }, undefined, 'SECURITY');
  }
}

// Factory function to create loggers
export function createLogger(component: string, level?: LogLevel): Logger {
  const envLevel = process.env.LOG_LEVEL;
  let logLevel = level;
  
  if (!logLevel && envLevel) {
    switch (envLevel.toUpperCase()) {
      case 'ERROR':
        logLevel = LogLevel.ERROR;
        break;
      case 'WARN':
        logLevel = LogLevel.WARN;
        break;
      case 'INFO':
        logLevel = LogLevel.INFO;
        break;
      case 'DEBUG':
        logLevel = LogLevel.DEBUG;
        break;
      default:
        logLevel = LogLevel.INFO;
    }
  }

  return new Logger(component, logLevel || LogLevel.INFO);
}

// Global error handler utilities
export class ErrorHandler {
  private static logger = createLogger('ErrorHandler');

  public static handleUncaughtException(error: Error): void {
    ErrorHandler.logger.error('Uncaught exception', {}, error, 'UNCAUGHT_EXCEPTION');
    // In production, you might want to gracefully shutdown here
    process.exit(1);
  }

  public static handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    ErrorHandler.logger.error('Unhandled promise rejection', { reason: String(reason) }, reason instanceof Error ? reason : undefined, 'UNHANDLED_REJECTION');
    // In production, you might want to gracefully shutdown here
  }

  public static setupGlobalHandlers(): void {
    process.on('uncaughtException', ErrorHandler.handleUncaughtException);
    process.on('unhandledRejection', ErrorHandler.handleUnhandledRejection);
  }
}