import { AppError, isAppError, categorizeError } from './errors.js';
import { createLogger, LogLevel, LogContext } from '@kanban-mcp/logging';

const logger = createLogger('ErrorHandler');

export interface ErrorHandlerOptions {
  includeStackTrace: boolean;
  logErrors: boolean;
  logLevel: LogLevel;
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  includeStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
  logLevel: LogLevel.ERROR
};

export class ErrorHandler {
  private options: ErrorHandlerOptions;

  constructor(options: Partial<ErrorHandlerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public handleError(error: Error, context?: LogContext): {
    statusCode: number;
    error: {
      name: string;
      message: string;
      statusCode: number;
      context?: Record<string, any>;
      stack?: string;
    };
  } {
    const errorInfo = categorizeError(error);
    
    // Log the error if logging is enabled
    if (this.options.logErrors) {
      this.logError(error, errorInfo, context);
    }

    // Prepare error response
    const response = {
      statusCode: errorInfo.statusCode,
      error: {
        name: error.name,
        message: error.message,
        statusCode: errorInfo.statusCode,
        ...(isAppError(error) && { context: error.context }),
        ...(this.options.includeStackTrace && { stack: error.stack })
      }
    };

    return response;
  }

  private logError(error: Error, errorInfo: ReturnType<typeof categorizeError>, context?: LogContext): void {
    const logContext: LogContext = {
      ...context,
      category: errorInfo.category,
      severity: errorInfo.severity,
      statusCode: errorInfo.statusCode,
      ...(isAppError(error) && { errorContext: error.context })
    };

    switch (errorInfo.severity) {
      case 'critical':
        logger.error(error.message, logContext, error, 'ERROR_HANDLER');
        break;
      case 'high':
        logger.error(error.message, logContext, error, 'ERROR_HANDLER');
        break;
      case 'medium':
        logger.warn(error.message, logContext, 'ERROR_HANDLER');
        break;
      case 'low':
        logger.info(error.message, logContext, 'ERROR_HANDLER');
        break;
    }
  }

  // Static convenience methods
  public static handle(error: Error, context?: LogContext): ReturnType<ErrorHandler['handleError']> {
    const handler = new ErrorHandler();
    return handler.handleError(error, context);
  }

  public static handleAsync<T>(
    promise: Promise<T>,
    context?: LogContext
  ): Promise<T> {
    return promise.catch((error) => {
      const handled = ErrorHandler.handle(error, context);
      throw error; // Re-throw the original error after logging
    });
  }
}

// Middleware factory for different frameworks
export function createErrorMiddleware(options?: Partial<ErrorHandlerOptions>) {
  const handler = new ErrorHandler(options);

  // Express/Fastify-style middleware
  return (error: Error, request?: any, reply?: any, next?: Function) => {
    const context: LogContext = {
      requestId: request?.id,
      method: request?.method,
      url: request?.url,
      ip: request?.ip,
      userAgent: request?.headers?.['user-agent']
    };

    const handled = handler.handleError(error, context);

    if (reply) {
      // Fastify response
      reply.code(handled.statusCode).send(handled.error);
    } else if (next) {
      // Express - let default error handler take over
      next(handled);
    }

    return handled;
  };
}

// Utility functions for common error handling patterns
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context?: LogContext
): (...args: T) => R {
  return (...args: T): R => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          ErrorHandler.handle(error, context);
          throw error;
        }) as R;
      }
      
      return result;
    } catch (error) {
      ErrorHandler.handle(error as Error, context);
      throw error;
    }
  };
}

export function withErrorHandlingAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: LogContext
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.handle(error as Error, context);
      throw error;
    }
  };
}

// Recovery strategies
export interface RecoveryStrategy<T> {
  maxRetries: number;
  retryDelay: number;
  shouldRetry: (error: Error, attempt: number) => boolean;
  fallback?: () => T | Promise<T>;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  strategy: Partial<RecoveryStrategy<T>> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error) => !isAppError(error) || error.statusCode >= 500,
    fallback
  } = strategy;

  let lastError: Error;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      attempt++;

      if (attempt > maxRetries || !shouldRetry(lastError, attempt)) {
        break;
      }

      logger.warn(`Retrying operation (attempt ${attempt}/${maxRetries})`, {
        attempt,
        maxRetries,
        error: lastError.message
      }, 'RETRY');

      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  // If we have a fallback, try it
  if (fallback) {
    try {
      logger.info('Using fallback strategy', {}, 'FALLBACK');
      return await Promise.resolve(fallback());
    } catch (fallbackError) {
      logger.error('Fallback strategy failed', {}, fallbackError as Error, 'FALLBACK');
    }
  }

  // All retries exhausted, throw the last error
  throw lastError!;
}