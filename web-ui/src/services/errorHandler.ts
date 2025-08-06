export interface ApiError {
  name: string;
  message: string;
  statusCode: number;
  context?: Record<string, any>;
  stack?: string;
}

export class ClientError extends Error {
  public readonly statusCode: number;
  public readonly context: Record<string, any>;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    context: Record<string, any> = {},
    isRetryable = false
  ) {
    super(message);
    this.name = 'ClientError';
    this.statusCode = statusCode;
    this.context = context;
    this.isRetryable = isRetryable;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ClientError);
    }
  }

  static fromApiError(apiError: ApiError): ClientError {
    return new ClientError(
      apiError.message,
      apiError.statusCode,
      apiError.context || {},
      apiError.statusCode >= 500 || apiError.statusCode === 429
    );
  }
}

export class NetworkError extends ClientError {
  constructor(message = 'Network error occurred') {
    super(message, 0, {}, true);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ClientError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, 408, { timeout }, true);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends ClientError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 400, { field, value });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ClientError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, { resource, identifier });
    this.name = 'NotFoundError';
  }
}

export class BusinessLogicError extends ClientError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 422, context);
    this.name = 'BusinessLogicError';
  }
}

export class RateLimitError extends ClientError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, { retryAfter }, true);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ClientError {
  constructor(message = 'Internal server error', statusCode = 500) {
    super(message, statusCode, {}, true);
    this.name = 'ServerError';
  }
}

// Error categorization
export function categorizeError(error: any): {
  category:
    | 'network'
    | 'validation'
    | 'not_found'
    | 'business_logic'
    | 'rate_limit'
    | 'server'
    | 'timeout'
    | 'unknown';
  severity: 'low' | 'medium' | 'high';
  isRetryable: boolean;
  userMessage: string;
} {
  if (error instanceof NetworkError) {
    return {
      category: 'network',
      severity: 'high',
      isRetryable: true,
      userMessage:
        'Unable to connect to the server. Please check your internet connection and try again.',
    };
  }

  if (error instanceof TimeoutError) {
    return {
      category: 'timeout',
      severity: 'medium',
      isRetryable: true,
      userMessage: 'The request is taking longer than expected. Please try again.',
    };
  }

  if (error instanceof ValidationError) {
    return {
      category: 'validation',
      severity: 'low',
      isRetryable: false,
      userMessage: error.message,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      category: 'not_found',
      severity: 'low',
      isRetryable: false,
      userMessage: error.message,
    };
  }

  if (error instanceof BusinessLogicError) {
    return {
      category: 'business_logic',
      severity: 'medium',
      isRetryable: false,
      userMessage: error.message,
    };
  }

  if (error instanceof RateLimitError) {
    return {
      category: 'rate_limit',
      severity: 'medium',
      isRetryable: true,
      userMessage: 'Too many requests. Please wait a moment and try again.',
    };
  }

  if (error instanceof ServerError) {
    return {
      category: 'server',
      severity: 'high',
      isRetryable: true,
      userMessage: 'A server error occurred. Please try again later.',
    };
  }

  // Unknown error
  return {
    category: 'unknown',
    severity: 'high',
    isRetryable: false,
    userMessage: 'An unexpected error occurred. Please try again.',
  };
}

// Retry logic
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry: (error: ClientError, attempt: number) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error, attempt) => error.isRetryable && attempt < 3,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: ClientError;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError =
        error instanceof ClientError
          ? error
          : new ClientError(error instanceof Error ? error.message : 'Unknown error', 500);

      attempt++;

      if (attempt > opts.maxRetries || !opts.shouldRetry(lastError, attempt)) {
        break;
      }

      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      console.log(
        `Retrying request (attempt ${attempt}/${opts.maxRetries}) after ${delay}ms delay`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Global error logger
export function logError(error: Error, context: Record<string, any> = {}) {
  const errorLog = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...(error instanceof ClientError && {
      statusCode: error.statusCode,
      isRetryable: error.isRetryable,
      errorContext: error.context,
    }),
  };

  console.error('Client Error:', errorLog);

  // Store in session storage for debugging
  try {
    const existingErrors = JSON.parse(sessionStorage.getItem('client-errors') || '[]');
    existingErrors.push(errorLog);
    if (existingErrors.length > 50) {
      existingErrors.splice(0, existingErrors.length - 50);
    }
    sessionStorage.setItem('client-errors', JSON.stringify(existingErrors));
  } catch (e) {
    console.warn('Failed to store error in session storage:', e);
  }

  // In production, you might want to send errors to an error reporting service
  // Example: Sentry, Bugsnag, etc.
}

// Error boundary integration
export function handleError(error: Error, context?: Record<string, any>): never {
  logError(error, context);
  throw error;
}
