import { DatabaseService } from '../src/database.service';
import { PrismaClient } from '@prisma/client';

/**
 * Initialize database schema for testing
 */
export async function initializeTestSchema(db: DatabaseService): Promise<void> {
  // Access the Prisma client through type assertion for testing
  const prisma = (db as any).prisma as PrismaClient;
  
  // Create all tables with proper schema
  await prisma.$executeRawUnsafe(`
    PRAGMA foreign_keys = ON;
    
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      landing_column_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      wip_limit INTEGER NOT NULL,
      is_done_column BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
    CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(position);
    
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      update_reason TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
    
    CREATE TABLE IF NOT EXISTS database_info (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      schema_version TEXT NOT NULL,
      last_migration DATETIME,
      health_check DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT OR REPLACE INTO database_info (id, schema_version, health_check) 
    VALUES ('singleton', '2.0.0', CURRENT_TIMESTAMP);
  `);
}

/**
 * Clean database for testing
 */
export async function cleanTestDatabase(db: DatabaseService): Promise<void> {
  const prisma = (db as any).prisma as PrismaClient;
  
  // Delete all data in reverse dependency order
  await prisma.$executeRawUnsafe('DELETE FROM tasks');
  await prisma.$executeRawUnsafe('DELETE FROM columns');
  await prisma.$executeRawUnsafe('DELETE FROM boards');
  await prisma.$executeRawUnsafe(`
    UPDATE database_info SET health_check = CURRENT_TIMESTAMP WHERE id = 'singleton'
  `);
}

/**
 * Create a test database instance with proper schema
 */
export async function createTestDatabase(name = 'test'): Promise<DatabaseService> {
  const { DatabaseFactory } = await import('../src/database.factory');
  
  const testDbPath = `./test-${name}-${Date.now()}.db`;
  const db = await DatabaseFactory.createDatabaseService({
    provider: 'sqlite',
    url: `file:${testDbPath}`,
    maxConnections: 1,
    enableLogging: false
  }, `test-${name}`);
  
  await initializeTestSchema(db);
  
  return db;
}