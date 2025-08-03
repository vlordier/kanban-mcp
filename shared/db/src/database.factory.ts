import { DatabaseService } from './database.service.js';
import { KanbanDB } from './legacy-adapter.js';
import { createDatabaseConfig, validateDatabaseConfig } from './config.js';
import type { DatabaseConfig, DatabaseConfigOptions } from './types.js';
// import { createLogger } from '@kanban-mcp/logging';
// import { DatabaseError } from '@kanban-mcp/errors';

// Temporary logger and error class
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any, error?: Error) => console.error(`[ERROR] ${message}`, meta || '', error || '')
};

class DatabaseError extends Error {
  constructor(operation: string, resource?: string, cause?: Error) {
    super(`Database error in ${operation}${resource ? ` on ${resource}` : ''}: ${cause?.message || 'Unknown error'}`);
    this.name = 'DatabaseError';
  }
}


/**
 * Database factory for creating database instances with different configurations
 */
export class DatabaseFactory {
  private static instances = new Map<string, DatabaseService>();

  /**
   * Create a new database service instance
   */
  static async createDatabaseService(
    options: DatabaseConfigOptions = {},
    instanceName = 'default'
  ): Promise<DatabaseService> {
    try {
      // Check if instance already exists
      if (this.instances.has(instanceName)) {
        logger.warn(`Database instance '${instanceName}' already exists, returning existing instance`);
        return this.instances.get(instanceName)!;
      }

      // Create and validate configuration
      const config = createDatabaseConfig(options);
      validateDatabaseConfig(config);

      // Create database service
      const service = new DatabaseService(config);
      await service.connect();

      // Store instance for reuse
      this.instances.set(instanceName, service);

      logger.info(`Database service '${instanceName}' created successfully`, {
        provider: config.provider,
        instanceName
      });

      return service;
    } catch (error) {
      logger.error(`Failed to create database service '${instanceName}'`, {}, error as Error);
      throw new DatabaseError('createDatabaseService', undefined, error as Error);
    }
  }

  /**
   * Create a legacy KanbanDB instance for backward compatibility
   */
  static async createLegacyDatabase(
    options: DatabaseConfigOptions = {},
    instanceName = 'legacy'
  ): Promise<KanbanDB> {
    try {
      const service = await this.createDatabaseService(options, instanceName);
      const legacyDb = new KanbanDB(service);

      logger.info(`Legacy database instance '${instanceName}' created successfully`);
      return legacyDb;
    } catch (error) {
      logger.error(`Failed to create legacy database '${instanceName}'`, {}, error as Error);
      throw new DatabaseError('createLegacyDatabase', undefined, error as Error);
    }
  }

  /**
   * Create database service from environment variables
   */
  static async createFromEnvironment(instanceName = 'env'): Promise<DatabaseService> {
    const options: DatabaseConfigOptions = {
      provider: process.env.DATABASE_PROVIDER as any,
      url: process.env.DATABASE_URL,
      maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? 
        parseInt(process.env.DATABASE_MAX_CONNECTIONS) : undefined,
      connectionTimeout: process.env.DATABASE_CONNECTION_TIMEOUT ? 
        parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) : undefined,
      queryTimeout: process.env.DATABASE_QUERY_TIMEOUT ? 
        parseInt(process.env.DATABASE_QUERY_TIMEOUT) : undefined,
      enableLogging: process.env.DATABASE_ENABLE_LOGGING === 'true',
      logLevel: process.env.DATABASE_LOG_LEVEL as any
    };

    return this.createDatabaseService(options, instanceName);
  }

  /**
   * Create test database instance
   */
  static async createTestDatabase(instanceName = 'test'): Promise<DatabaseService> {
    const options: DatabaseConfigOptions = {
      provider: 'sqlite',
      url: `file:./test-${Date.now()}.db`,
      maxConnections: 1,
      connectionTimeout: 5000,
      queryTimeout: 10000,
      enableLogging: false
    };

    return this.createDatabaseService(options, instanceName);
  }

  /**
   * Create in-memory SQLite database for testing
   */
  static async createInMemoryDatabase(instanceName = 'memory'): Promise<DatabaseService> {
    const options: DatabaseConfigOptions = {
      provider: 'sqlite',
      url: 'file::memory:?cache=shared',
      maxConnections: 1,
      connectionTimeout: 5000,
      queryTimeout: 10000,
      enableLogging: false
    };

    return this.createDatabaseService(options, instanceName);
  }

  /**
   * Get existing database instance
   */
  static getInstance(instanceName = 'default'): DatabaseService | undefined {
    return this.instances.get(instanceName);
  }

  /**
   * Close and remove database instance
   */
  static async closeInstance(instanceName = 'default'): Promise<void> {
    const instance = this.instances.get(instanceName);
    if (instance) {
      await instance.disconnect();
      this.instances.delete(instanceName);
      logger.info(`Database instance '${instanceName}' closed and removed`);
    }
  }

  /**
   * Close all database instances
   */
  static async closeAllInstances(): Promise<void> {
    const closePromises = Array.from(this.instances.entries()).map(async ([name, service]) => {
      try {
        await service.disconnect();
        logger.info(`Database instance '${name}' closed`);
      } catch (error) {
        logger.error(`Failed to close database instance '${name}'`, {}, error as Error);
      }
    });

    await Promise.allSettled(closePromises);
    this.instances.clear();
    logger.info('All database instances closed');
  }

  /**
   * Get all active instance names
   */
  static getActiveInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Check health of all instances
   */
  static async checkAllInstancesHealth(): Promise<Record<string, boolean>> {
    const healthChecks: Record<string, boolean> = {};
    
    for (const [name, service] of this.instances.entries()) {
      try {
        const health = await service.healthCheck();
        healthChecks[name] = health.isHealthy;
      } catch (error) {
        logger.error(`Health check failed for instance '${name}'`, {}, error as Error);
        healthChecks[name] = false;
      }
    }

    return healthChecks;
  }
}

/**
 * Convenience function to create a database service with SQLite
 */
export async function createSQLiteDatabase(
  filePath = './data/kanban.db',
  instanceName = 'sqlite'
): Promise<DatabaseService> {
  return DatabaseFactory.createDatabaseService({
    provider: 'sqlite',
    url: `file:${filePath}`,
    maxConnections: 1
  }, instanceName);
}

/**
 * Convenience function to create a database service with PostgreSQL
 */
export async function createPostgreSQLDatabase(
  connectionString: string,
  instanceName = 'postgresql'
): Promise<DatabaseService> {
  return DatabaseFactory.createDatabaseService({
    provider: 'postgresql',
    url: connectionString,
    maxConnections: 20
  }, instanceName);
}

/**
 * Convenience function to create a database service with MySQL
 */
export async function createMySQLDatabase(
  connectionString: string,
  instanceName = 'mysql'
): Promise<DatabaseService> {
  return DatabaseFactory.createDatabaseService({
    provider: 'mysql',
    url: connectionString,
    maxConnections: 20
  }, instanceName);
}

// Legacy function for backward compatibility
export function createDBInstance(folderPath: string): any {
  logger.warn('createDBInstance is deprecated. Use DatabaseFactory.createLegacyDatabase instead.');
  
  // Return a promise that creates a legacy database
  return DatabaseFactory.createLegacyDatabase({
    provider: 'sqlite',
    url: `file:${folderPath}/kanban.db`
  });
}