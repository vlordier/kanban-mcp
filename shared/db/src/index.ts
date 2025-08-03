// Modern database service exports
export { DatabaseService } from './services/database.service.js';
export { 
  BaseDatabaseService,
  BoardService,
  TaskService,
  ColumnService,
  DatabaseError,
  ValidationError,
  NotFoundError,
  BusinessLogicError,
  ColumnCapacityFullError,
  withRetry,
  logger
} from './services/index.js';
export { DatabaseFactory } from './database.factory.js';
export { 
  createDatabaseConfig, 
  createDatabaseUrls, 
  validateDatabaseConfig,
  createTestDatabaseConfig,
  createProductionDatabaseConfig
} from './config.js';

// Type exports
export type {
  DatabaseConfig,
  DatabaseConfigOptions,
  Board,
  Column,
  Task,
  TaskSummary,
  ColumnWithTasks,
  BoardWithColumns,
  BoardCreateInput,
  BoardUpdateInput,
  TaskCreateInput,
  TaskUpdateInput,
  TaskMoveInput,
  BoardFilters,
  TaskFilters,
  DatabaseHealth,
  DatabaseMetrics,
  QueryOptions
} from './types.js';

// Convenience functions
export {
  createSQLiteDatabase,
  createPostgreSQLDatabase,
  createMySQLDatabase
} from './database.factory.js';

// Legacy compatibility exports
export { KanbanDB } from './legacy-adapter.js';
export { createDBInstance } from './database.factory.js';

// Seed functions
export { seedDatabase, clearDatabase } from './seed.js';

// Legacy exports for backward compatibility
export * from './db.js';
