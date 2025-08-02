// Base application error class
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    context: Record<string, any> = {}
  ) {
    super(message);
    
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack
    };
  }
}

// Validation errors (400)
export class ValidationError extends AppError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 400, true, context);
  }
}

export class InvalidInputError extends ValidationError {
  constructor(field: string, value: any, rule: string) {
    super(`Invalid value for field '${field}': ${JSON.stringify(value)}. Rule: ${rule}`, {
      field,
      value,
      rule
    });
  }
}

export class MissingFieldError extends ValidationError {
  constructor(field: string) {
    super(`Required field '${field}' is missing`, { field });
  }
}

// Authentication/Authorization errors (401/403)
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

// Not found errors (404)
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, true, { resource, identifier });
  }
}

export class BoardNotFoundError extends NotFoundError {
  constructor(boardId: string) {
    super('Board', boardId);
  }
}

export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: string) {
    super('Task', taskId);
  }
}

export class ColumnNotFoundError extends NotFoundError {
  constructor(columnId: string) {
    super('Column', columnId);
  }
}

// Conflict errors (409)
export class ConflictError extends AppError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 409, true, context);
  }
}

export class DuplicateError extends ConflictError {
  constructor(resource: string, field: string, value: any) {
    super(`${resource} with ${field} '${value}' already exists`, {
      resource,
      field,
      value
    });
  }
}

// Business logic errors (422)
export class BusinessLogicError extends AppError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 422, true, context);
  }
}

export class ColumnCapacityFullError extends BusinessLogicError {
  constructor(columnName: string, currentCount: number, limit: number) {
    super(`Column '${columnName}' is at capacity (${currentCount}/${limit})`, {
      columnName,
      currentCount,
      limit
    });
  }
}

export class InvalidStateTransitionError extends BusinessLogicError {
  constructor(from: string, to: string, reason?: string) {
    const message = `Invalid state transition from '${from}' to '${to}'${reason ? `: ${reason}` : ''}`;
    super(message, { from, to, reason });
  }
}

// Rate limiting (429)
export class RateLimitError extends AppError {
  constructor(limit: number, window: string) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, 429, true, { limit, window });
  }
}

// Server errors (500+)
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', context: Record<string, any> = {}) {
    super(message, 500, true, context);
  }
}

export class DatabaseError extends InternalServerError {
  constructor(operation: string, table?: string, originalError?: Error) {
    const message = `Database operation failed: ${operation}${table ? ` on ${table}` : ''}`;
    super(message, {
      operation,
      table,
      originalError: originalError?.message
    });
  }
}

export class ExternalServiceError extends InternalServerError {
  constructor(service: string, operation: string, statusCode?: number) {
    super(`External service error: ${service} ${operation} failed`, {
      service,
      operation,
      statusCode
    });
  }
}

// Service unavailable (503)
export class ServiceUnavailableError extends AppError {
  constructor(service: string, reason?: string) {
    const message = `Service '${service}' is unavailable${reason ? `: ${reason}` : ''}`;
    super(message, 503, true, { service, reason });
  }
}

// Timeout errors (408)
export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 408, true, {
      operation,
      timeout
    });
  }
}

// Error factory functions
export function createValidationError(field: string, value: any, rule: string): ValidationError {
  return new InvalidInputError(field, value, rule);
}

export function createNotFoundError(resource: string, identifier?: string): NotFoundError {
  return new NotFoundError(resource, identifier);
}

export function createBusinessLogicError(message: string, context?: Record<string, any>): BusinessLogicError {
  return new BusinessLogicError(message, context);
}

// Type guards
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: any): boolean {
  return isAppError(error) && error.isOperational;
}

// Error categorization
export function categorizeError(error: Error): {
  category: 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'business_logic' | 'server' | 'external' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  statusCode: number;
} {
  if (error instanceof ValidationError) {
    return { category: 'validation', severity: 'low', statusCode: 400 };
  }
  
  if (error instanceof AuthenticationError) {
    return { category: 'authentication', severity: 'medium', statusCode: 401 };
  }
  
  if (error instanceof AuthorizationError) {
    return { category: 'authorization', severity: 'medium', statusCode: 403 };
  }
  
  if (error instanceof NotFoundError) {
    return { category: 'not_found', severity: 'low', statusCode: 404 };
  }
  
  if (error instanceof ConflictError) {
    return { category: 'conflict', severity: 'medium', statusCode: 409 };
  }
  
  if (error instanceof BusinessLogicError) {
    return { category: 'business_logic', severity: 'medium', statusCode: 422 };
  }
  
  if (error instanceof ExternalServiceError) {
    return { category: 'external', severity: 'high', statusCode: 500 };
  }
  
  if (error instanceof InternalServerError) {
    return { category: 'server', severity: 'high', statusCode: 500 };
  }
  
  // Unknown error
  return { category: 'unknown', severity: 'critical', statusCode: 500 };
}