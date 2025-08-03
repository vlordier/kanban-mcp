import { createTestDatabaseFromExisting } from './migrate-setup';

describe('Schema Initialization', () => {
  it('should initialize database schema', async () => {
    const db = await createTestDatabaseFromExisting('schema-test');
    
    // Try to run a simple query to check if tables exist
    const health = await db.healthCheck();
    expect(health.isHealthy).toBe(true);
    expect(health.schemaVersion).toBe('2.0.0');
    
    await db.disconnect();
  });

  it('should allow basic operations after schema init', async () => {
    const db = await createTestDatabaseFromExisting('operations-test');
    
    // Test creating a board - should work if schema is properly initialized
    const result = await db.createBoard({
      name: 'Schema Test Board',
      goal: 'Testing schema initialization',
      columns: [
        { name: 'Test Column', position: 0, wipLimit: 5, isDoneColumn: false }
      ],
      landingColumnPosition: 0
    });

    expect(result.boardId).toBeDefined();
    expect(result.landingColumnId).toBeDefined();
    
    await db.disconnect();
  });
});