import { DatabaseFactory } from '../src/database.factory';
import { createSQLiteDatabase, createTestDatabaseConfig } from '../src/index';

describe('DatabaseFactory', () => {
  afterEach(async () => {
    // Clean up any created instances
    await DatabaseFactory.closeAllInstances();
  });

  describe('Instance Management', () => {
    it('should create database service instance', async () => {
      const config = createTestDatabaseConfig();
      const db = await DatabaseFactory.createDatabaseService(config, 'test-instance');
      
      expect(db).toBeDefined();
      expect(DatabaseFactory.getInstance('test-instance')).toBe(db);
      
      await DatabaseFactory.closeInstance('test-instance');
    });

    it('should reuse existing instance', async () => {
      const config = createTestDatabaseConfig();
      const db1 = await DatabaseFactory.createDatabaseService(config, 'reuse-test');
      const db2 = await DatabaseFactory.createDatabaseService(config, 'reuse-test');
      
      expect(db1).toBe(db2);
      
      await DatabaseFactory.closeInstance('reuse-test');
    });

    it('should create test database', async () => {
      const db = await DatabaseFactory.createTestDatabase('factory-test');
      
      expect(db).toBeDefined();
      
      // Should be able to connect
      const health = await db.healthCheck();
      expect(health).toBeDefined();
      
      await DatabaseFactory.closeInstance('factory-test');
    });

    it('should create in-memory database', async () => {
      const db = await DatabaseFactory.createInMemoryDatabase('memory-test');
      
      expect(db).toBeDefined();
      
      await DatabaseFactory.closeInstance('memory-test');
    });

    it('should get active instances', async () => {
      await DatabaseFactory.createTestDatabase('instance1');
      await DatabaseFactory.createTestDatabase('instance2');
      
      const activeInstances = DatabaseFactory.getActiveInstances();
      expect(activeInstances).toContain('instance1');
      expect(activeInstances).toContain('instance2');
      
      await DatabaseFactory.closeAllInstances();
    });

    it('should close all instances', async () => {
      await DatabaseFactory.createTestDatabase('close1');
      await DatabaseFactory.createTestDatabase('close2');
      
      expect(DatabaseFactory.getActiveInstances()).toHaveLength(2);
      
      await DatabaseFactory.closeAllInstances();
      
      expect(DatabaseFactory.getActiveInstances()).toHaveLength(0);
    });
  });

  describe('Convenience Functions', () => {
    it('should create SQLite database', async () => {
      const testPath = `./factory-test-${Date.now()}.db`;
      const db = await createSQLiteDatabase(testPath, 'sqlite-test');
      
      expect(db).toBeDefined();
      
      await DatabaseFactory.closeInstance('sqlite-test');
    });

    it('should create legacy database instance', async () => {
      const legacyDb = await DatabaseFactory.createLegacyDatabase({
        provider: 'sqlite',
        url: `file:./legacy-test-${Date.now()}.db`
      }, 'legacy-test');
      
      expect(legacyDb).toBeDefined();
      expect(typeof legacyDb.createBoard).toBe('function');
      expect(typeof legacyDb.getAllBoards).toBe('function');
      
      await DatabaseFactory.closeInstance('legacy-test');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration', async () => {
      await expect(DatabaseFactory.createDatabaseService({
        provider: 'sqlite',
        url: '',
        maxConnections: -1
      } as any, 'invalid-test')).rejects.toThrow();
    });
  });

  describe('Health Monitoring', () => {
    it('should check health of all instances', async () => {
      await DatabaseFactory.createTestDatabase('health1');
      await DatabaseFactory.createTestDatabase('health2');
      
      const healthStatus = await DatabaseFactory.checkAllInstancesHealth();
      
      expect(healthStatus).toHaveProperty('health1');
      expect(healthStatus).toHaveProperty('health2');
      
      await DatabaseFactory.closeAllInstances();
    });
  });
});