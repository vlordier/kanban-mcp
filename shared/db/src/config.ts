import { DatabaseConfig, DatabaseConfigOptions } from './types.js';
// import { createLogger } from '@kanban-mcp/logging';

const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string) => console.warn(`[WARN] ${message}`)
};

// DatabaseConfigOptions is now exported from types.ts

/**
 * Create database configuration from environment variables and options
 */
export function createDatabaseConfig(options: DatabaseConfigOptions = {}): DatabaseConfig {
  // Get configuration from environment with fallbacks
  const provider = options.provider || 
    (process.env.DATABASE_PROVIDER as 'sqlite' | 'postgresql' | 'mysql') || 
    'sqlite';
  
  const url = options.url || process.env.DATABASE_URL || getDefaultUrl(provider);
  
  const config: DatabaseConfig = {
    provider,
    url,
    maxConnections: options.maxConnections || 
      parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
    connectionTimeout: options.connectionTimeout || 
      parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000'),
    queryTimeout: options.queryTimeout || 
      parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
    enableLogging: options.enableLogging ?? 
      process.env.DATABASE_ENABLE_LOGGING === 'true',
    logLevel: options.logLevel || 
      (process.env.DATABASE_LOG_LEVEL as 'query' | 'info' | 'warn' | 'error') || 
      'error'
  };

  logger.info('Database configuration created', {
    provider: config.provider,
    maxConnections: config.maxConnections,
    enableLogging: config.enableLogging
  });

  return config;
}

/**
 * Get default database URL based on provider
 */
function getDefaultUrl(provider: string): string {
  switch (provider) {
    case 'sqlite':
      return 'file:./data/kanban.db';
    case 'postgresql':
      return 'postgresql://localhost:5432/kanban';
    case 'mysql':
      return 'mysql://localhost:3306/kanban';
    default:
      throw new Error(`Unsupported database provider: ${provider}`);
  }
}

/**
 * Create database URLs for different environments
 */
export function createDatabaseUrls(baseConfig: {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}) {
  const {
    host = 'localhost',
    database = 'kanban',
    username = 'kanban',
    password = ''
  } = baseConfig;

  return {
    postgresql: (port = 5432) => 
      `postgresql://${username}:${password}@${host}:${port}/${database}`,
    
    mysql: (port = 3306) =>
      `mysql://${username}:${password}@${host}:${port}/${database}`,
    
    sqlite: (path = './data/kanban.db') =>
      `file:${path}`
  };
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  const errors: string[] = [];

  // Validate URL format
  try {
    if (config.provider !== 'sqlite') {
      new URL(config.url);
    }
  } catch {
    errors.push(`Invalid database URL format: ${config.url}`);
  }

  // Validate numeric values
  if (config.maxConnections < 1 || config.maxConnections > 100) {
    errors.push('maxConnections must be between 1 and 100');
  }

  if (config.connectionTimeout < 1000) {
    errors.push('connectionTimeout must be at least 1000ms');
  }

  if (config.queryTimeout < 1000) {
    errors.push('queryTimeout must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new Error(`Database configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Create test database configuration
 */
export function createTestDatabaseConfig(): DatabaseConfig {
  return {
    provider: 'sqlite',
    url: 'file:./test.db',
    maxConnections: 1,
    connectionTimeout: 5000,
    queryTimeout: 10000,
    enableLogging: false,
    logLevel: 'error'
  };
}

/**
 * Create production database configuration with security defaults
 */
export function createProductionDatabaseConfig(options: {
  provider: 'postgresql' | 'mysql';
  url: string;
}): DatabaseConfig {
  return {
    provider: options.provider,
    url: options.url,
    maxConnections: 20,
    connectionTimeout: 30000,
    queryTimeout: 60000,
    enableLogging: false, // Disable query logging in production
    logLevel: 'error'
  };
}