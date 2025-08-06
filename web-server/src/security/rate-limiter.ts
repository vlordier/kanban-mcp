import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import config from '../config/environment.js';
import { RateLimitError } from '../middleware/validation.js';

/**
 * Rate limiting configuration for different endpoint types
 */
interface RateLimitConfig {
  max: number;
  timeWindow: string;
  skipOnError?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

// Different rate limits for different endpoint types
const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  api: {
    max: config.get('RATE_LIMIT_MAX'),
    timeWindow: config.get('RATE_LIMIT_WINDOW'),
  },
  
  // Authentication endpoints (stricter)
  auth: {
    max: 5,
    timeWindow: '1 minute',
    skipSuccessfulRequests: true, // Only count failed attempts
  },
  
  // Import/Export endpoints (very strict)
  importExport: {
    max: 3,
    timeWindow: '1 minute',
  },
  
  // Health check endpoints (more lenient)
  health: {
    max: 1000,
    timeWindow: '1 minute',
  },
} as const;

/**
 * Setup rate limiting for the Fastify application
 */
export async function setupRateLimiting(fastify: FastifyInstance): Promise<void> {
  // Global rate limiter
  await fastify.register(rateLimit, {
    ...RATE_LIMIT_CONFIGS.api,
    keyGenerator: (request: any) => {
      // Use IP address as default key
      return request.ip;
    },
    errorResponseBuilder: (request: any, context: any) => {
      const error = new RateLimitError(
        `Rate limit exceeded. ${context.max} requests per ${context.timeWindow} allowed.`
      );
      
      return {
        error: error.message,
        code: error.code,
        details: {
          limit: context.max,
          window: context.timeWindow,
          remaining: context.ttl,
        },
        timestamp: new Date().toISOString(),
        requestId: request.requestId || 'unknown',
        path: request.url,
      };
    },
    onExceeding: (request: any) => {
      request.log.warn({
        ip: request.ip,
        url: request.url,
        userAgent: request.headers['user-agent'],
      }, 'Rate limit approaching');
    },
    onExceeded: (request: any) => {
      request.log.warn({
        ip: request.ip,
        url: request.url,
        userAgent: request.headers['user-agent'],
      }, 'Rate limit exceeded');
    },
  });
}

/**
 * Create a context-specific rate limiter
 */
export function createContextRateLimiter(
  config: RateLimitConfig,
  context: string
) {
  return rateLimit({
    ...config,
    keyGenerator: (request: any) => {
      // Include context in the key for separate rate limiting buckets
      return `${context}:${request.ip}`;
    },
    errorResponseBuilder: (request: any, rateLimitContext: any) => {
      const error = new RateLimitError(
        `Rate limit exceeded for ${context}. ${rateLimitContext.max} requests per ${rateLimitContext.timeWindow} allowed.`
      );
      
      return {
        error: error.message,
        code: error.code,
        details: {
          context,
          limit: rateLimitContext.max,
          window: rateLimitContext.timeWindow,
          remaining: rateLimitContext.ttl,
        },
        timestamp: new Date().toISOString(),
        requestId: request.requestId || 'unknown',
        path: request.url,
      };
    },
  });
}

// Export specific rate limiters for different contexts
export const authRateLimiter = createContextRateLimiter(RATE_LIMIT_CONFIGS.auth, 'auth');
export const importExportRateLimiter = createContextRateLimiter(RATE_LIMIT_CONFIGS.importExport, 'import-export');
export const healthRateLimiter = createContextRateLimiter(RATE_LIMIT_CONFIGS.health, 'health');