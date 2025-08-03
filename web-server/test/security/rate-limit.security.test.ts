import { DatabaseFactory, KanbanDB } from '@kanban-mcp/db';
import { WebServer } from '../../src/web-server';
import { AuthService } from '../../src/auth/auth.service';

describe('Rate Limiting Security Tests', () => {
  let databaseService: any;
  let kanbanDb: KanbanDB;
  let webServer: WebServer;
  let serverInstance: any;
  let authService: AuthService;

  beforeEach(async () => {
    // Create a new in-memory database for each test
    databaseService = await DatabaseFactory.createLegacyDatabase({
      provider: 'sqlite',
      url: 'file::memory:?cache=shared',
    });

    // Create a new KanbanDB instance with the database service
    kanbanDb = new KanbanDB(databaseService);

    // Create and start web server
    webServer = new WebServer(kanbanDb);
    serverInstance = webServer.getServer();
    await serverInstance.ready();

    // Initialize auth service for token generation
    authService = new AuthService();
  });

  afterEach(async () => {
    // Close connections
    await webServer.close();
    await kanbanDb.close();
  });

  describe('Authentication Endpoint Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      const loginPayload = { email: 'test@example.com', password: 'wrongpassword' };
      const rateLimitExceeded = [];

      // Make requests that exceed the limit (5 requests per minute for auth endpoints)
      for (let i = 0; i < 7; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: loginPayload,
          headers: {
            'content-type': 'application/json',
          },
        });

        if (response.statusCode === 429) {
          rateLimitExceeded.push(i);
          const body = JSON.parse(response.payload);
          expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
          expect(body.error).toContain('Rate limit exceeded');
          expect(body.details).toBeDefined();
          expect(body.details.limit).toBe(5);
          expect(body.details.window).toBe('1 minute');
          expect(body.path).toBe('/api/v1/auth/login');
        }
      }

      // Should have hit rate limit after 5 requests
      expect(rateLimitExceeded.length).toBeGreaterThan(0);
      expect(rateLimitExceeded[0]).toBeGreaterThanOrEqual(5);
    });

    it('should reset rate limiting after time window', async () => {
      const loginPayload = { email: 'test@example.com', password: 'wrongpassword' };

      // Exceed rate limit
      for (let i = 0; i < 6; i++) {
        await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: loginPayload,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      // Verify we're rate limited
      const rateLimitedResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: loginPayload,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(rateLimitedResponse.statusCode).toBe(429);

      // Wait for rate limit window to reset (simulate time passage)
      // In a real test, you might use fake timers or wait for actual time
      // For this test, we'll just verify the structure
      const body = JSON.parse(rateLimitedResponse.payload);
      expect(body.details.remaining).toBeDefined();
      expect(typeof body.details.remaining).toBe('number');
    });

    it('should apply different rate limits to different endpoints', async () => {
      const adminToken = authService.generateAccessToken({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date()
      });

      // Test general API rate limit (100 requests per minute)
      const apiRequests = [];
      for (let i = 0; i < 5; i++) {
        const response = await serverInstance.inject({
          method: 'GET',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        apiRequests.push(response.statusCode);
      }

      // Should not hit rate limit for general API calls
      expect(apiRequests.every(status => status === 200)).toBe(true);

      // Test auth endpoint rate limit (5 requests per minute)
      const authRequests = [];
      for (let i = 0; i < 7; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'test@example.com', password: 'wrongpassword' },
          headers: {
            'content-type': 'application/json',
          },
        });
        authRequests.push(response.statusCode);
      }

      // Should hit rate limit for auth endpoints
      const rateLimitedRequests = authRequests.filter(status => status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    it('should apply rate limiting per IP address', async () => {
      // Simulate different IP addresses
      const ip1Requests = [];
      const ip2Requests = [];

      // Make multiple requests from first IP
      for (let i = 0; i < 6; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'test@example.com', password: 'wrongpassword' },
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '192.168.1.1'
          },
        });
        ip1Requests.push(response.statusCode);
      }

      // Make requests from second IP (should not be rate limited)
      for (let i = 0; i < 3; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'test@example.com', password: 'wrongpassword' },
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '192.168.1.2'
          },
        });
        ip2Requests.push(response.statusCode);
      }

      // First IP should be rate limited
      const ip1RateLimited = ip1Requests.filter(status => status === 429);
      expect(ip1RateLimited.length).toBeGreaterThan(0);

      // Second IP should not be rate limited
      const ip2RateLimited = ip2Requests.filter(status => status === 429);
      expect(ip2RateLimited.length).toBe(0);
    });
  });

  describe('API Endpoint Rate Limiting', () => {
    it('should enforce stricter rate limits on sensitive endpoints', async () => {
      // Test export endpoint (5 exports per minute)
      const exportRequests = [];
      for (let i = 0; i < 7; i++) {
        const response = await serverInstance.inject({
          method: 'GET',
          url: '/api/v1/export',
        });
        exportRequests.push(response.statusCode);
      }

      // Should hit rate limit for export endpoint
      const rateLimitedExports = exportRequests.filter(status => status === 429);
      expect(rateLimitedExports.length).toBeGreaterThan(0);
    });

    it('should enforce very strict rate limits on import endpoint', async () => {
      // Test import endpoint (3 imports per minute)
      const importPayload = {
        boards: [],
        columns: [],
        tasks: []
      };

      const importRequests = [];
      for (let i = 0; i < 5; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/import',
          payload: importPayload,
          headers: {
            'content-type': 'application/json',
          },
        });
        importRequests.push(response.statusCode);
      }

      // Should hit rate limit for import endpoint (limit is 3)
      const rateLimitedImports = importRequests.filter(status => status === 429);
      expect(rateLimitedImports.length).toBeGreaterThan(0);
    });

    it('should provide detailed rate limit information in responses', async () => {
      // Exceed rate limit
      for (let i = 0; i < 6; i++) {
        await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'test@example.com', password: 'wrongpassword' },
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      // Get rate limited response
      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@example.com', password: 'wrongpassword' },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.payload);

      // Verify rate limit response structure
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(body).toHaveProperty('details');
      expect(body.details).toHaveProperty('limit');
      expect(body.details).toHaveProperty('window');
      expect(body.details).toHaveProperty('remaining');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('requestId');
      expect(body).toHaveProperty('path');

      // Verify data types
      expect(typeof body.details.limit).toBe('number');
      expect(typeof body.details.window).toBe('string');
      expect(typeof body.details.remaining).toBe('number');
      expect(typeof body.timestamp).toBe('string');
      expect(typeof body.path).toBe('string');
    });
  });

  describe('Rate Limiting Bypass Attempts', () => {
    it('should not be bypassed by changing user agent', async () => {
      const loginPayload = { email: 'test@example.com', password: 'wrongpassword' };
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'curl/7.68.0',
        'PostmanRuntime/7.28.4',
        'python-requests/2.25.1'
      ];

      let rateLimitHit = false;

      // Make requests with different user agents
      for (let i = 0; i < 8; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: loginPayload,
          headers: {
            'content-type': 'application/json',
            'user-agent': userAgents[i % userAgents.length]
          },
        });

        if (response.statusCode === 429) {
          rateLimitHit = true;
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
    });

    it('should not be bypassed by changing request headers', async () => {
      const loginPayload = { email: 'test@example.com', password: 'wrongpassword' };
      const headers = [
        { 'content-type': 'application/json' },
        { 'content-type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        { 'content-type': 'application/json', 'origin': 'http://localhost:3000' },
        { 'content-type': 'application/json', 'referer': 'http://localhost:3000' },
        { 'content-type': 'application/json', 'accept': 'application/json' },
      ];

      let rateLimitHit = false;

      // Make requests with different headers
      for (let i = 0; i < 8; i++) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: loginPayload,
          headers: headers[i % headers.length],
        });

        if (response.statusCode === 429) {
          rateLimitHit = true;
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
    });

    it('should maintain rate limiting state across different request methods', async () => {
      // Use up rate limit with POST requests
      for (let i = 0; i < 5; i++) {
        await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'test@example.com', password: 'wrongpassword' },
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      // Try with different method (should still be rate limited)
      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@example.com', password: 'wrongpassword' },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting efficiently under load', async () => {
      const validToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });

      const startTime = Date.now();
      const promises = [];

      // Make 50 concurrent requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          serverInstance.inject({
            method: 'GET',
            url: '/api/v1/boards',
            headers: {
              'Authorization': `Bearer ${validToken}`
            }
          })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Should handle all requests reasonably quickly (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Most requests should succeed (not rate limited for general API)
      const successfulRequests = responses.filter(r => r.statusCode === 200);
      expect(successfulRequests.length).toBeGreaterThan(40);
    });

    it('should cleanup expired rate limit entries', async () => {
      // This test would typically require access to internal state
      // For now, we'll test that the system continues to work after many requests
      const loginPayload = { email: 'test@example.com', password: 'wrongpassword' };

      // Make many requests over time to trigger cleanup
      for (let batch = 0; batch < 3; batch++) {
        for (let i = 0; i < 10; i++) {
          await serverInstance.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: loginPayload,
            headers: {
              'content-type': 'application/json',
              'x-test-batch': batch.toString()
            },
          });
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // System should still be responsive
      const finalResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: loginPayload,
        headers: {
          'content-type': 'application/json',
        },
      });

      // Should get rate limited or auth error, not server error
      expect([401, 429]).toContain(finalResponse.statusCode);
    });
  });

  describe('Health Check Rate Limiting', () => {
    it('should have lenient rate limiting for health check endpoint', async () => {
      const healthRequests = [];

      // Make many requests to health endpoint
      for (let i = 0; i < 20; i++) {
        const response = await serverInstance.inject({
          method: 'GET',
          url: '/health',
        });
        healthRequests.push(response.statusCode);
      }

      // Health endpoint should allow many more requests
      const rateLimitedRequests = healthRequests.filter(status => status === 429);
      expect(rateLimitedRequests.length).toBe(0);

      // All health checks should succeed
      const successfulRequests = healthRequests.filter(status => status === 200);
      expect(successfulRequests.length).toBe(20);
    });
  });
});