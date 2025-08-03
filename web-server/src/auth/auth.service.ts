import { FastifyInstance, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import config from '../config/environment.js';
import { AuthenticationError, AuthorizationError } from '../middleware/validation.js';

// User interface (simplified for now - in production this would come from a user service)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt?: Date;
}

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

/**
 * Authentication service for JWT-based authentication
 */
export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  
  // In-memory store for demo purposes (use Redis/Database in production)
  private sessions = new Map<string, { userId: string; createdAt: Date }>();
  private refreshTokens = new Map<string, { userId: string; sessionId: string; createdAt: Date }>();
  
  // Demo users (in production, this would be a proper user service)
  private users = new Map<string, User>([
    ['admin@example.com', {
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
    }],
    ['user@example.com', {
      id: 'regular-user-id',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
      createdAt: new Date(),
    }],
  ]);

  constructor() {
    this.jwtSecret = config.get('JWT_SECRET');
    this.jwtExpiresIn = config.get('JWT_EXPIRES_IN');
  }

  /**
   * Authenticate user with email/password (simplified demo implementation)
   */
  async authenticate(email: string, password: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    // Demo authentication - in production, verify against hashed passwords
    const user = this.users.get(email);
    if (!user || password !== 'demo123') {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    
    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return { user, tokens };
  }

  /**
   * Generate access token only (for testing purposes)
   */
  generateAccessToken(user: User, expiresIn?: string): string {
    const sessionId = randomUUID();
    
    // Store session
    this.sessions.set(sessionId, {
      userId: user.id,
      createdAt: new Date(),
    });

    // Generate access token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };
    
    return jwt.sign(
      payload,
      this.jwtSecret,
      { expiresIn: expiresIn || this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = randomUUID();
    
    // Store session
    this.sessions.set(sessionId, {
      userId: user.id,
      createdAt: new Date(),
    });

    // Generate access token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };
    
    const accessToken = jwt.sign(
      payload,
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );

    // Generate refresh token
    const refreshToken = randomUUID();
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      sessionId,
      createdAt: new Date(),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validate and decode access token
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Check if session is still valid
      const session = this.sessions.get(payload.sessionId);
      if (!session || session.userId !== payload.userId) {
        return null;
      }

      // Get user (in production, this would query the database)
      const user = Array.from(this.users.values()).find(u => u.id === payload.userId);
      return user || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const tokenData = this.refreshTokens.get(refreshToken);
    if (!tokenData) {
      return null;
    }

    // Check if refresh token is expired (7 days)
    const tokenAge = Date.now() - tokenData.createdAt.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (tokenAge > maxAge) {
      this.refreshTokens.delete(refreshToken);
      return null;
    }

    // Get user
    const user = Array.from(this.users.values()).find(u => u.id === tokenData.userId);
    if (!user) {
      return null;
    }

    // Remove old refresh token
    this.refreshTokens.delete(refreshToken);

    // Generate new tokens
    return this.generateTokens(user);
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    
    // Remove associated refresh tokens
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.sessionId === sessionId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  /**
   * Get user by ID (demo implementation)
   */
  async getUserById(userId: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.id === userId) || null;
  }
}

/**
 * Authentication middleware
 */
export async function authenticationMiddleware(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const authService = new AuthService();
  const user = await authService.validateToken(token);

  if (!user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  request.user = user;
}

/**
 * Authorization middleware factory
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest): Promise<void> => {
    if (!request.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }
  };
}

/**
 * Setup JWT authentication for Fastify
 */
export async function setupAuthentication(fastify: FastifyInstance): Promise<void> {
  // Register JWT plugin
  await fastify.register(require('@fastify/jwt'), {
    secret: config.get('JWT_SECRET'),
  });

  // Create auth service instance
  const authService = new AuthService();

  // Add authentication routes
  fastify.post('/api/v1/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    
    try {
      const result = await authService.authenticate(email, password);
      
      request.log.info({ userId: result.user.id, email }, 'User authenticated successfully');
      
      return reply.code(200).send({
        success: true,
        message: 'Authentication successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        tokens: result.tokens,
      });
    } catch (error) {
      throw error;
    }
  });

  // Refresh token endpoint
  fastify.post('/api/v1/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    
    const tokens = await authService.refreshToken(refreshToken);
    if (!tokens) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    return reply.code(200).send({
      success: true,
      message: 'Token refreshed successfully',
      tokens,
    });
  });

  // Logout endpoint
  fastify.post('/api/v1/auth/logout', {
    preHandler: [authenticationMiddleware],
  }, async (request, reply) => {
    // Extract session ID from JWT (would need to decode token again)
    // For simplicity, just return success
    request.log.info({ userId: request.user?.id }, 'User logged out');
    
    return reply.code(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // User profile endpoint
  fastify.get('/api/v1/auth/profile', {
    preHandler: [authenticationMiddleware],
  }, async (request, reply) => {
    return reply.code(200).send({
      success: true,
      user: {
        id: request.user!.id,
        email: request.user!.email,
        name: request.user!.name,
        role: request.user!.role,
        lastLoginAt: request.user!.lastLoginAt,
      },
    });
  });
}