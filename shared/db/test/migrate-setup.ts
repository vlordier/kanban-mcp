import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { DatabaseService } from '../src/database.service';

const execAsync = promisify(exec);

/**
 * Create a test database with proper migrations
 */
export async function createTestDatabaseWithMigration(name = 'test'): Promise<DatabaseService> {
  const testDbPath = path.resolve(`./test-${name}-${Date.now()}.db`);
  
  try {
    // Ensure the database file doesn't exist
    try {
      await fs.unlink(testDbPath);
    } catch {
      // File doesn't exist, that's fine
    }
    
    // Run Prisma migrations to create the schema
    const env = {
      ...process.env,
      DATABASE_URL: `file:${testDbPath}`
    };
    
    await execAsync('npx prisma migrate deploy', { env });
    
    // Now create the database service
    const { DatabaseFactory } = await import('../src/database.factory');
    const db = await DatabaseFactory.createDatabaseService({
      provider: 'sqlite',
      url: `file:${testDbPath}`,
      maxConnections: 1,
      enableLogging: false
    }, `test-${name}`);
    
    return db;
    
  } catch (error) {
    console.error('Failed to create test database with migration:', error);
    throw error;
  }
}

/**
 * Use shared database with cleanup between tests - simpler and more reliable
 */
export async function createTestDatabaseFromExisting(name = 'test'): Promise<DatabaseService> {
  const { DatabaseFactory } = await import('../src/database.factory');
  
  // Use the existing test.db that we created with migrations  
  const db = await DatabaseFactory.createDatabaseService({
    provider: 'sqlite',
    url: 'file:./prisma/test.db',
    maxConnections: 1,
    enableLogging: false
  }, `test-${name}`);
  
  // Clean up any existing data to ensure test isolation
  try {
    const boards = await db.getAllBoards();
    for (const board of boards) {
      try {
        await db.deleteBoard(board.id);
      } catch {
        // Ignore individual delete errors - board might already be deleted
      }
    }
  } catch {
    // Ignore cleanup errors
  }
  
  return db;
}

/**
 * Clean up test database 
 */
export async function cleanupTestDatabase(db: DatabaseService): Promise<void> {
  try {
    // Clean up data first
    const boards = await db.getAllBoards();
    for (const board of boards) {
      try {
        await db.deleteBoard(board.id);
      } catch {
        // Ignore individual delete errors
      }
    }
    
    // Then disconnect
    await db.disconnect();
  } catch (error) {
    // Ignore cleanup errors
  }
}