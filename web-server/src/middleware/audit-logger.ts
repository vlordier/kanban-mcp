import { FastifyRequest } from 'fastify';
import config from '../config/environment.js';

interface AuditLogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Comprehensive audit logging middleware
 * Logs all requests with security and performance metrics
 */
export async function auditLoggerMiddleware(request: FastifyRequest): Promise<void> {
  const startTime = Date.now();
  
  // Base audit log entry
  const auditEntry: Partial<AuditLogEntry> = {
    requestId: request.requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    // TODO: Add userId when authentication is implemented
    // userId: request.user?.id,
  };

  // Log request start
  if (config.get('ENABLE_REQUEST_LOGGING')) {
    request.log.info(auditEntry, 'Request started');
  }

  // Store start time for response logging
  (request as any).startTime = startTime;
  (request as any).auditEntry = auditEntry;
}

/**
 * Setup audit logging hooks for the Fastify instance
 */
export function setupAuditLogging(fastify: any): void {
  // Hook into response to log completion
  fastify.addHook('onSend', async (request: any, reply: any, payload: any) => {
    const responseTime = Date.now() - request.startTime;
    
    const completeEntry: AuditLogEntry = {
      ...request.auditEntry,
      statusCode: reply.statusCode,
      responseTime,
    };

    // Log based on response status
    if (reply.statusCode >= 500) {
      request.log.error(completeEntry, 'Request completed with server error');
    } else if (reply.statusCode >= 400) {
      request.log.warn(completeEntry, 'Request completed with client error');
    } else {
      request.log.info(completeEntry, 'Request completed successfully');
    }

    return payload;
  });

  // Hook into errors
  fastify.addHook('onError', async (request: any, reply: any, error: any) => {
    const responseTime = Date.now() - request.startTime;
    
    const errorEntry: AuditLogEntry = {
      ...request.auditEntry,
      statusCode: reply.statusCode,
      responseTime,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    };

    request.log.error(errorEntry, 'Request failed with error');
  });
}