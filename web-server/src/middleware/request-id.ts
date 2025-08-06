import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

// Extend FastifyRequest to include requestId
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

/**
 * Request ID middleware that adds a unique identifier to each request
 * for tracing and logging purposes
 */
export async function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Generate or extract request ID
  const requestId = 
    request.headers['x-request-id'] as string ||
    request.headers['x-correlation-id'] as string ||
    randomUUID();

  // Add to request object
  request.requestId = requestId;

  // Add to response headers for client tracing
  reply.header('X-Request-ID', requestId);
  
  // Add to logger context
  request.log = request.log.child({ requestId });
}