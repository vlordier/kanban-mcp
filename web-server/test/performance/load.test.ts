import { DatabaseFactory, KanbanDB } from '@kanban-mcp/db';
import { WebServer } from '../../src/web-server';
import { AuthService } from '../../src/auth/auth.service';
import autocannon from 'autocannon';

describe('Performance and Load Testing', () => {
  let databaseService: any;
  let kanbanDb: KanbanDB;
  let webServer: WebServer;
  let serverInstance: any;
  let authService: AuthService;
  let validToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Create a new in-memory database for the entire test suite
    databaseService = await DatabaseFactory.createLegacyDatabase({
      provider: 'sqlite',
      url: 'file::memory:?cache=shared',
    });

    kanbanDb = new KanbanDB(databaseService);
    webServer = new WebServer(kanbanDb);
    serverInstance = webServer.getServer();
    await serverInstance.ready();

    authService = new AuthService();
    validToken = authService.generateAccessToken({
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    });

    adminToken = authService.generateAccessToken({
      id: 'admin-user',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    });
  });

  afterAll(async () => {
    await webServer.close();
    await kanbanDb.close();
  });

  describe('API Performance Tests', () => {
    it('should handle concurrent board creation requests', async () => {
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/boards',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: 'Load Test Board', 
          goal: 'Load testing performance' 
        }),
        connections: 10,
        duration: 10, // 10 seconds
        requests: [
          {
            method: 'POST',
            path: '/api/v1/boards',
            headers: {
              'Authorization': `Bearer ${validToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              name: 'Load Test Board', 
              goal: 'Load testing performance' 
            })
          }
        ]
      });

      // Verify performance metrics
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.latency.p95).toBeLessThan(1000); // 95th percentile < 1 second
      expect(result.requests.average).toBeGreaterThan(5); // > 5 req/sec
      expect(result['2xx']).toBeGreaterThan(0); // Some requests should succeed

      console.log('Board Creation Performance:', {
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95,
        avgThroughput: result.requests.average,
        totalRequests: result.requests.total,
        errors: result.errors
      });
    }, 30000); // 30 second timeout

    it('should handle concurrent board listing requests', async () => {
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/boards',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        connections: 20,
        duration: 15 // 15 seconds
      });

      // Verify performance metrics
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.latency.p95).toBeLessThan(500); // 95th percentile < 500ms
      expect(result.requests.average).toBeGreaterThan(50); // > 50 req/sec

      console.log('Board Listing Performance:', {
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95,
        avgThroughput: result.requests.average,
        totalRequests: result.requests.total,
        errors: result.errors
      });
    }, 30000);

    it('should handle mixed read/write workload', async () => {
      // Create some initial data
      const createResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Baseline Board', goal: 'For mixed workload testing' }
      });

      const createBody = JSON.parse(createResponse.payload);
      const boardId = createBody.boardId;

      const result = await autocannon({
        url: 'http://localhost:8221',
        connections: 15,
        duration: 20, // 20 seconds
        requests: [
          // 70% read requests
          {
            method: 'GET',
            path: '/api/v1/boards',
            headers: {
              'Authorization': `Bearer ${validToken}`
            },
            weight: 7
          },
          {
            method: 'GET',
            path: `/api/v1/boards/${boardId}`,
            headers: {
              'Authorization': `Bearer ${validToken}`
            },
            weight: 3
          },
          // 30% write requests
          {
            method: 'POST',
            path: '/api/v1/boards',
            headers: {
              'Authorization': `Bearer ${validToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              name: 'Mixed Workload Board', 
              goal: 'Testing mixed read/write performance' 
            }),
            weight: 3
          }
        ]
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.latency.p95).toBeLessThan(800); // 95th percentile < 800ms
      expect(result.requests.average).toBeGreaterThan(20); // > 20 req/sec

      console.log('Mixed Workload Performance:', {
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95,
        avgThroughput: result.requests.average,
        totalRequests: result.requests.total,
        errors: result.errors
      });
    }, 40000);
  });

  describe('Rate Limiting Performance Tests', () => {
    it('should respect rate limiting under load', async () => {
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: 'test@example.com', 
          password: 'wrongpassword' 
        }),
        connections: 20,
        duration: 10 // 10 seconds
      });

      // Should hit rate limits
      expect(result['4xx']).toBeGreaterThan(0);
      const rateLimitedRequests = result.statusCodeStats['429'] || 0;
      expect(rateLimitedRequests).toBeGreaterThan(0);

      console.log('Rate Limiting Performance:', {
        totalRequests: result.requests.total,
        rateLimitedRequests: rateLimitedRequests,
        rateLimitPercentage: (rateLimitedRequests / result.requests.total * 100).toFixed(2) + '%',
        avgLatency: result.latency.average
      });
    }, 20000);

    it('should maintain performance with different endpoints', async () => {
      const endpoints = [
        { path: '/health', expectedStatus: 200 },
        { path: '/api/v1/boards', expectedStatus: 200 },
        { path: '/api/v1/export', expectedStatus: 200 }
      ];

      for (const endpoint of endpoints) {
        const result = await autocannon({
          url: `http://localhost:8221${endpoint.path}`,
          method: 'GET',
          connections: 10,
          duration: 5 // 5 seconds each
        });

        expect(result.errors).toBe(0);
        expect(result.timeouts).toBe(0);
        
        // Health endpoint should be very fast
        if (endpoint.path === '/health') {
          expect(result.latency.p95).toBeLessThan(100); // < 100ms
          expect(result.requests.average).toBeGreaterThan(100); // > 100 req/sec
        }

        console.log(`${endpoint.path} Performance:`, {
          avgLatency: result.latency.average,
          p95Latency: result.latency['95'],
          avgThroughput: result.requests.average,
          totalRequests: result.requests.total
        });
      }
    }, 30000);
  });

  describe('Memory and Resource Usage Tests', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const initialMemory = process.memoryUsage();

      // Run sustained load test
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/boards',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        connections: 15,
        duration: 30 // 30 seconds of sustained load
      });

      const finalMemory = process.memoryUsage();

      // Memory growth should be reasonable
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAcceptableGrowth = 50 * 1024 * 1024; // 50MB

      expect(heapGrowth).toBeLessThan(maxAcceptableGrowth);
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);

      console.log('Memory Usage Test:', {
        initialHeapMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalHeapMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
        heapGrowthMB: Math.round(heapGrowth / 1024 / 1024),
        totalRequests: result.requests.total,
        avgThroughput: result.requests.average
      });
    }, 45000);

    it('should handle database stress testing', async () => {
      // Create multiple boards to stress the database
      const operations = Array(50).fill(0).map((_, i) => ({
        method: 'POST',
        path: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: `Stress Test Board ${i}`, 
          goal: `Database stress testing board number ${i}` 
        })
      }));

      const result = await autocannon({
        url: 'http://localhost:8221',
        connections: 20,
        amount: 100, // Total 100 requests
        requests: operations
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result['2xx']).toBe(100); // All requests should succeed

      // Verify database is still responsive
      const healthResponse = await serverInstance.inject({
        method: 'GET',
        url: '/health',
      });

      expect(healthResponse.statusCode).toBe(200);
      const healthData = JSON.parse(healthResponse.payload);
      expect(healthData.checks.database.status).toBe('healthy');

      console.log('Database Stress Test:', {
        totalRequests: result.requests.total,
        successfulRequests: result['2xx'],
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95,
        dbResponseTime: healthData.checks.database.responseTime
      });
    }, 30000);
  });

  describe('Error Handling Performance', () => {
    it('should handle authentication errors efficiently', async () => {
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/boards',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: 'Should Fail Board', 
          goal: 'This should fail authentication' 
        }),
        connections: 10,
        duration: 10
      });

      // All requests should fail with 401
      expect(result['4xx']).toBe(result.requests.total);
      expect(result.statusCodeStats['401']).toBe(result.requests.total);
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      
      // Error responses should still be fast
      expect(result.latency.p95).toBeLessThan(500);

      console.log('Authentication Error Performance:', {
        totalRequests: result.requests.total,
        unauthorizedRequests: result.statusCodeStats['401'],
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95
      });
    }, 20000);

    it('should handle validation errors efficiently', async () => {
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/boards',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: '', // Invalid empty name
          goal: '' // Invalid empty goal
        }),
        connections: 10,
        duration: 10
      });

      // All requests should fail with validation error
      expect(result['4xx']).toBe(result.requests.total);
      expect(result.statusCodeStats['400']).toBe(result.requests.total);
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      
      // Validation error responses should be fast
      expect(result.latency.p95).toBeLessThan(300);

      console.log('Validation Error Performance:', {
        totalRequests: result.requests.total,
        validationErrors: result.statusCodeStats['400'],
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95
      });
    }, 20000);
  });

  describe('Concurrency and Race Condition Tests', () => {
    it('should handle concurrent operations on same resources', async () => {
      // Create a board first
      const createResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Concurrency Test Board', goal: 'Testing concurrent operations' }
      });

      const createBody = JSON.parse(createResponse.payload);
      const boardId = createBody.boardId;

      // Test concurrent reads of the same board
      const result = await autocannon({
        url: `http://localhost:8221/api/v1/boards/${boardId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        },
        connections: 25,
        duration: 10
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result['2xx']).toBe(result.requests.total);
      expect(result.latency.p95).toBeLessThan(400);

      console.log('Concurrent Read Performance:', {
        totalRequests: result.requests.total,
        successfulRequests: result['2xx'],
        avgLatency: result.latency.average,
        p95Latency: result.latency.p95,
        concurrentConnections: 25
      });
    }, 20000);

    it('should maintain data consistency under concurrent writes', async () => {
      const boardName = 'Consistency Test Board';
      
      // Create multiple boards concurrently with same name pattern
      const result = await autocannon({
        url: 'http://localhost:8221/api/v1/boards',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: boardName, 
          goal: 'Testing data consistency under concurrent writes' 
        }),
        connections: 10,
        amount: 20 // Create exactly 20 boards
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result['2xx']).toBe(20);

      // Verify all boards were created correctly
      const listResponse = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      const boards = JSON.parse(listResponse.payload);
      const testBoards = boards.filter((board: any) => board.name === boardName);
      
      // Should have created all 20 boards
      expect(testBoards.length).toBeGreaterThanOrEqual(20);

      console.log('Concurrent Write Consistency:', {
        requestedBoards: 20,
        createdBoards: testBoards.length,
        totalRequests: result.requests.total,
        successfulRequests: result['2xx'],
        avgLatency: result.latency.average
      });
    }, 25000);
  });

  describe('Scalability Baseline Tests', () => {
    it('should establish performance baseline metrics', async () => {
      const baselineTests = [
        {
          name: 'Simple GET',
          config: {
            url: 'http://localhost:8221/api/v1/boards',
            method: 'GET',
            connections: 10,
            duration: 5
          },
          expectations: {
            maxLatencyP95: 200,
            minThroughput: 100
          }
        },
        {
          name: 'Authenticated GET',
          config: {
            url: 'http://localhost:8221/api/v1/boards',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${validToken}` },
            connections: 10,
            duration: 5
          },
          expectations: {
            maxLatencyP95: 300,
            minThroughput: 80
          }
        },
        {
          name: 'POST with validation',
          config: {
            url: 'http://localhost:8221/api/v1/boards',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${validToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              name: 'Baseline Test Board', 
              goal: 'Performance baseline testing' 
            }),
            connections: 5,
            duration: 5
          },
          expectations: {
            maxLatencyP95: 500,
            minThroughput: 10
          }
        }
      ];

      const results = [];

      for (const test of baselineTests) {
        const result = await autocannon(test.config);
        
        expect(result.errors).toBe(0);
        expect(result.timeouts).toBe(0);
        expect(result.latency['95']).toBeLessThan(test.expectations.maxLatencyP95);
        expect(result.requests.average).toBeGreaterThan(test.expectations.minThroughput);

        results.push({
          testName: test.name,
          avgLatency: result.latency.average,
          p95Latency: result.latency['95'],
          avgThroughput: result.requests.average,
          totalRequests: result.requests.total
        });
      }

      console.log('Performance Baseline Results:');
      results.forEach(result => {
        console.log(`${result.testName}:`, {
          avgLatency: result.avgLatency + 'ms',
          p95Latency: result.p95Latency + 'ms',
          avgThroughput: result.avgThroughput.toFixed(1) + ' req/sec',
          totalRequests: result.totalRequests
        });
      });
    }, 30000);
  });
});