import {
  createDatabaseConfig,
  createDatabaseUrls,
  validateDatabaseConfig,
  createTestDatabaseConfig,
  createProductionDatabaseConfig
} from '../src/config';

describe('Database Configuration', () => {
  describe('createDatabaseConfig', () => {
    it('should create default configuration', () => {
      const config = createDatabaseConfig();
      
      expect(config).toMatchObject({
        provider: 'sqlite',
        url: expect.stringContaining('file:'),
        maxConnections: expect.any(Number),
        connectionTimeout: expect.any(Number),
        queryTimeout: expect.any(Number),
        enableLogging: expect.any(Boolean),
        logLevel: expect.any(String)
      });
    });

    it('should merge options with defaults', () => {
      const config = createDatabaseConfig({
        provider: 'postgresql',
        maxConnections: 20,
        enableLogging: true
      });

      expect(config.provider).toBe('postgresql');
      expect(config.maxConnections).toBe(20);
      expect(config.enableLogging).toBe(true);
      expect(config.connectionTimeout).toBeDefined(); // Should have default
    });

    it('should use environment variables', () => {
      const originalUrl = process.env.DATABASE_URL;
      const originalProvider = process.env.DATABASE_PROVIDER;
      
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';
      process.env.DATABASE_PROVIDER = 'postgresql';
      
      const config = createDatabaseConfig();
      
      expect(config.url).toBe('postgresql://test:test@localhost/testdb');
      expect(config.provider).toBe('postgresql');
      
      // Restore original values
      if (originalUrl) process.env.DATABASE_URL = originalUrl;
      else delete process.env.DATABASE_URL;
      if (originalProvider) process.env.DATABASE_PROVIDER = originalProvider;
      else delete process.env.DATABASE_PROVIDER;
    });

    it('should override environment with explicit options', () => {
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://env:env@localhost/envdb';
      
      const config = createDatabaseConfig({
        url: 'sqlite:explicit.db'
      });
      
      expect(config.url).toBe('sqlite:explicit.db');
      
      // Restore
      if (originalUrl) process.env.DATABASE_URL = originalUrl;
      else delete process.env.DATABASE_URL;
    });
  });

  describe('createDatabaseUrls', () => {
    it('should create database URLs for different providers', () => {
      const urls = createDatabaseUrls({
        host: 'localhost',
        database: 'testdb',
        username: 'testuser',
        password: 'testpass'
      });

      expect(urls.postgresql()).toBe('postgresql://testuser:testpass@localhost:5432/testdb');
      expect(urls.mysql()).toBe('mysql://testuser:testpass@localhost:3306/testdb');
      expect(urls.sqlite()).toBe('file:./data/kanban.db');
    });

    it('should use custom ports', () => {
      const urls = createDatabaseUrls({
        host: 'remote.host',
        database: 'mydb',
        username: 'user',
        password: 'pass'
      });

      expect(urls.postgresql(5433)).toBe('postgresql://user:pass@remote.host:5433/mydb');
      expect(urls.mysql(3307)).toBe('mysql://user:pass@remote.host:3307/mydb');
    });

    it('should use custom SQLite path', () => {
      const urls = createDatabaseUrls({});
      expect(urls.sqlite('/custom/path.db')).toBe('file:/custom/path.db');
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should validate correct configuration', () => {
      const config = createTestDatabaseConfig();
      expect(() => validateDatabaseConfig(config)).not.toThrow();
    });

    it('should reject invalid maxConnections', () => {
      const config = {
        ...createTestDatabaseConfig(),
        maxConnections: 0
      };
      
      expect(() => validateDatabaseConfig(config)).toThrow('maxConnections');
    });

    it('should reject short timeouts', () => {
      const config = {
        ...createTestDatabaseConfig(),
        connectionTimeout: 500
      };
      
      expect(() => validateDatabaseConfig(config)).toThrow('connectionTimeout');
    });

    it('should validate PostgreSQL URL format', () => {
      const config = {
        ...createTestDatabaseConfig(),
        provider: 'postgresql' as const,
        url: 'invalid-url'
      };
      
      expect(() => validateDatabaseConfig(config)).toThrow('Invalid database URL');
    });

    it('should accept SQLite file URLs', () => {
      const config = {
        ...createTestDatabaseConfig(),
        provider: 'sqlite' as const,
        url: 'file:./test.db'
      };
      
      expect(() => validateDatabaseConfig(config)).not.toThrow();
    });
  });

  describe('createTestDatabaseConfig', () => {
    it('should create test configuration', () => {
      const config = createTestDatabaseConfig();
      
      expect(config).toMatchObject({
        provider: 'sqlite',
        url: 'file:./test.db',
        maxConnections: 1,
        enableLogging: false,
        logLevel: 'error'
      });
    });
  });

  describe('createProductionDatabaseConfig', () => {
    it('should create production configuration for PostgreSQL', () => {
      const config = createProductionDatabaseConfig({
        provider: 'postgresql',
        url: 'postgresql://user:pass@localhost/prod'
      });
      
      expect(config).toMatchObject({
        provider: 'postgresql',
        url: 'postgresql://user:pass@localhost/prod',
        maxConnections: 20,
        connectionTimeout: 30000,
        queryTimeout: 60000,
        enableLogging: false,
        logLevel: 'error'
      });
    });

    it('should create production configuration for MySQL', () => {
      const config = createProductionDatabaseConfig({
        provider: 'mysql',
        url: 'mysql://user:pass@localhost/prod'
      });
      
      expect(config.provider).toBe('mysql');
      expect(config.maxConnections).toBe(20);
      expect(config.enableLogging).toBe(false);
    });
  });

  describe('Environment Variable Handling', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore original environment
      process.env = { ...originalEnv };
    });

    it('should parse numeric environment variables', () => {
      process.env.DATABASE_MAX_CONNECTIONS = '15';
      process.env.DATABASE_CONNECTION_TIMEOUT = '20000';
      process.env.DATABASE_QUERY_TIMEOUT = '45000';
      
      const config = createDatabaseConfig();
      
      expect(config.maxConnections).toBe(15);
      expect(config.connectionTimeout).toBe(20000);
      expect(config.queryTimeout).toBe(45000);
    });

    it('should parse boolean environment variables', () => {
      process.env.DATABASE_ENABLE_LOGGING = 'true';
      
      const config = createDatabaseConfig();
      
      expect(config.enableLogging).toBe(true);
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.DATABASE_URL;
      delete process.env.DATABASE_PROVIDER;
      delete process.env.DATABASE_MAX_CONNECTIONS;
      
      const config = createDatabaseConfig();
      
      expect(config).toBeDefined();
      expect(config.provider).toBe('sqlite'); // Default
      expect(config.maxConnections).toBeGreaterThan(0); // Default
    });
  });
});