import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

// Standardized API error interface
export interface APIError {
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
  requestId: string;
  path: string;
}

// Custom error classes
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public readonly code = 'AUTHENTICATION_ERROR';
  public readonly statusCode = 401;
  
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly code = 'AUTHORIZATION_ERROR';
  public readonly statusCode = 403;
  
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND';
  public readonly statusCode = 404;
  
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public readonly code = 'CONFLICT';
  public readonly statusCode = 409;
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly statusCode = 429;
  
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Request validation middleware factory
 * Creates middleware that validates request body, params, or query against a Zod schema
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  target: 'body' | 'params' | 'query' = 'body'
) {
  return async (request: FastifyRequest): Promise<void> => {
    try {
      const data = request[target];
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const details = result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.code === 'invalid_type' ? (issue as any).received : undefined,
        }));
        
        throw new ValidationError('Request validation failed', details);
      }
      
      // Replace the original data with the parsed and validated data
      (request as any)[target] = result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Handle unexpected validation errors
      throw new ValidationError('Invalid request data', { 
        target, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };
}

/**
 * Global error handler for standardized API responses
 */
export function setupErrorHandler(fastify: any): void {
  fastify.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.requestId || 'unknown';
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle validation errors (Zod)
    if (error instanceof ZodError) {
      const apiError: APIError = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
        timestamp,
        requestId,
        path,
      };

      request.log.warn({ error: apiError }, 'Validation error');
      return reply.code(400).send(apiError);
    }

    // Handle custom application errors
    if (error.statusCode && error.code) {
      const apiError: APIError = {
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp,
        requestId,
        path,
      };

      const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
      request.log[logLevel]({ error: apiError }, `API error: ${error.code}`);
      
      return reply.code(error.statusCode).send(apiError);
    }

    // Handle Fastify validation errors
    if (error.validation) {
      const apiError: APIError = {
        error: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        details: error.validation,
        timestamp,
        requestId,
        path,
      };

      request.log.warn({ error: apiError }, 'Fastify validation error');
      return reply.code(400).send(apiError);
    }

    // Handle unexpected errors
    const statusCode = error.statusCode || 500;
    const isServerError = statusCode >= 500;

    const apiError: APIError = {
      error: isServerError ? 'Internal Server Error' : error.message || 'Bad Request',
      code: error.code || (isServerError ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      timestamp,
      requestId,
      path,
    };

    // Don't expose internal error details in production
    if (isServerError && process.env.NODE_ENV === 'production') {
      delete apiError.details;
    } else if (error.details) {
      apiError.details = error.details;
    }

    const logLevel = isServerError ? 'error' : 'warn';
    request.log[logLevel]({ 
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode,
      },
      apiError 
    }, `${isServerError ? 'Server' : 'Client'} error`);

    return reply.code(statusCode).send(apiError);
  });
}