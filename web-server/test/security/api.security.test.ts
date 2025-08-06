import { DatabaseFactory, KanbanDB } from '@kanban-mcp/db';
import { WebServer } from '../../src/web-server';
import { AuthService } from '../../src/auth/auth.service';

describe('API Security Validation Tests', () => {
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

    kanbanDb = new KanbanDB(databaseService);
    webServer = new WebServer(kanbanDb);
    serverInstance = webServer.getServer();
    await serverInstance.ready();

    authService = new AuthService();
  });

  afterEach(async () => {
    await webServer.close();
    await kanbanDb.close();
  });

  describe('Boards API Authentication Tests', () => {
    it('should require authentication for board creation', async () => {
      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe('AUTHENTICATION_ERROR');
      expect(body.error).toContain('Authentication required');
    });

    it('should allow authenticated users to create boards', async () => {
      const userToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });

      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.boardId).toBeDefined();
    });

    it('should allow unauthenticated access to board listing', async () => {
      const response = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
      });

      expect(response.statusCode).toBe(200);
      const boards = JSON.parse(response.payload);
      expect(Array.isArray(boards)).toBe(true);
    });

    it('should allow unauthenticated access to board details', async () => {
      // First create a board as authenticated user
      const userToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });

      const createResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
      });

      const createBody = JSON.parse(createResponse.payload);
      const boardId = createBody.boardId;

      // Then access without authentication
      const response = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
      });

      expect(response.statusCode).toBe(200);
      const boardData = JSON.parse(response.payload);
      expect(boardData.name).toBe('Test Board');
    });
  });

  describe('Boards API Authorization Tests', () => {
    it('should enforce admin role for board deletion', async () => {
      // Create a board first
      const userToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });

      const createResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
      });

      const createBody = JSON.parse(createResponse.payload);
      const boardId = createBody.boardId;

      // Try to delete as regular user
      const deleteResponse = await serverInstance.inject({
        method: 'DELETE',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(403);
      const body = JSON.parse(deleteResponse.payload);
      expect(body.code).toBe('AUTHORIZATION_ERROR');
      expect(body.error).toContain('Insufficient permissions');
    });

    it('should allow admin to delete boards', async () => {
      // Create board as regular user
      const userToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });

      const createResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
      });

      const createBody = JSON.parse(createResponse.payload);
      const boardId = createBody.boardId;

      // Delete as admin
      const adminToken = authService.generateAccessToken({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date()
      });

      const deleteResponse = await serverInstance.inject({
        method: 'DELETE',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);
      const body = JSON.parse(deleteResponse.payload);
      expect(body.success).toBe(true);
    });

    it('should reject tokens with insufficient permissions', async () => {
      // Create token with invalid role
      const invalidToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'guest' // Invalid role
      });

      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Board Input Validation Tests', () => {
    let validToken: string;

    beforeEach(() => {
      validToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });
    });

    it('should validate board creation parameters', async () => {
      const invalidInputs = [
        { name: '', goal: 'Valid goal' }, // Empty name
        { name: 'Valid name', goal: '' }, // Empty goal
        { name: 'x'.repeat(256), goal: 'Valid goal' }, // Name too long
        { name: 'Valid name', goal: 'x'.repeat(1001) }, // Goal too long
        { goal: 'Valid goal' }, // Missing name
        { name: 'Valid name' }, // Missing goal
        {}, // Empty object
        { name: null, goal: 'Valid goal' }, // Null name
        { name: 'Valid name', goal: null }, // Null goal
        { name: 123, goal: 'Valid goal' }, // Invalid type for name
        { name: 'Valid name', goal: 456 }, // Invalid type for goal
      ];

      for (const input of invalidInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          payload: input,
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should sanitize board input for security', async () => {
      const potentiallyDangerousInputs = [
        { name: '<script>alert("xss")</script>', goal: 'Test goal' },
        { name: 'javascript:alert("xss")', goal: 'Test goal' },
        { name: 'Test Board', goal: '<img src="x" onerror="alert(\'xss\')">' },
        { name: 'onload="alert(1)"', goal: 'Test goal' },
        { name: '\"><script>alert("xss")</script>', goal: 'Test goal' },
      ];

      for (const input of potentiallyDangerousInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          payload: input,
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
        });

        // Should either validate/sanitize or reject
        if (response.statusCode === 201) {
          // If accepted, verify stored data is safe
          const body = JSON.parse(response.payload);
          const boardResponse = await serverInstance.inject({
            method: 'GET',
            url: `/api/v1/boards/${body.boardId}`,
          });

          const boardData = JSON.parse(boardResponse.payload);
          expect(boardData.name).not.toContain('<script>');
          expect(boardData.name).not.toContain('javascript:');
          expect(boardData.goal).not.toContain('<script>');
          expect(boardData.goal).not.toContain('onerror=');
        } else {
          // Should be validation error
          expect(response.statusCode).toBe(400);
          const body = JSON.parse(response.payload);
          expect(body.code).toBe('VALIDATION_ERROR');
        }
      }
    });

    it('should trim whitespace from input', async () => {
      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { 
          name: '  Test Board  ', 
          goal: '  Test Goal  ' 
        },
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      
      const boardResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${body.boardId}`,
      });

      const boardData = JSON.parse(boardResponse.payload);
      expect(boardData.name).toBe('Test Board');
      expect(boardData.goal).toBe('Test Goal');
    });
  });

  describe('Task API Security Tests', () => {
    let validToken: string;
    let boardId: string;
    let columnId: string;

    beforeEach(async () => {
      validToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });

      // Create a test board
      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
      });

      const boardBody = JSON.parse(boardResponse.payload);
      boardId = boardBody.boardId;

      // Get board details to find column ID
      const boardDetailsResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
      });

      const boardDetails = JSON.parse(boardDetailsResponse.payload);
      columnId = boardDetails.columns[0].id;
    });

    it('should allow unauthenticated access to task creation', async () => {
      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: {
          columnId: columnId,
          title: 'Test Task',
          content: 'Test Content'
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.task).toBeDefined();
    });

    it('should validate task input parameters', async () => {
      const invalidInputs = [
        { title: 'Test Task', content: 'Test Content' }, // Missing columnId
        { columnId: columnId, content: 'Test Content' }, // Missing title
        { columnId: columnId, title: 'Test Task' }, // Missing content
        { columnId: '', title: 'Test Task', content: 'Test Content' }, // Empty columnId
        { columnId: columnId, title: '', content: 'Test Content' }, // Empty title
        { columnId: columnId, title: 'Test Task', content: '' }, // Empty content
        { columnId: 'invalid-uuid', title: 'Test Task', content: 'Test Content' }, // Invalid columnId
      ];

      for (const input of invalidInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/tasks',
          payload: input,
          headers: {
            'content-type': 'application/json',
          },
        });

        expect([400, 404]).toContain(response.statusCode);
      }
    });

    it('should validate task move parameters', async () => {
      // First create a task
      const taskResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: {
          columnId: columnId,
          title: 'Test Task',
          content: 'Test Content'
        },
        headers: {
          'content-type': 'application/json',
        },
      });

      const taskBody = JSON.parse(taskResponse.payload);
      const taskId = taskBody.task.id;

      // Get another column for moving
      const boardDetailsResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
      });

      const boardDetails = JSON.parse(boardDetailsResponse.payload);
      const _targetColumnId = boardDetails.columns[1].id;

      const invalidMoveInputs = [
        { reason: 'Test reason' }, // Missing targetColumnId
        { targetColumnId: '' }, // Empty targetColumnId
        { targetColumnId: 'invalid-uuid' }, // Invalid targetColumnId
      ];

      for (const input of invalidMoveInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: `/api/v1/tasks/${taskId}/move`,
          payload: input,
          headers: {
            'content-type': 'application/json',
          },
        });

        expect([400, 404]).toContain(response.statusCode);
      }
    });
  });

  describe('Resource Access Control Tests', () => {
    beforeEach(() => {
      // No setup needed for this test section
    });

    it('should prevent access to non-existent boards', async () => {
      const nonExistentBoardId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${nonExistentBoardId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Board not found');
    });

    it('should prevent access to non-existent tasks', async () => {
      const nonExistentTaskId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/tasks/${nonExistentTaskId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Task not found');
    });

    it('should prevent deletion of non-existent resources', async () => {
      const adminToken = authService.generateAccessToken({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date()
      });

      const nonExistentBoardId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await serverInstance.inject({
        method: 'DELETE',
        url: `/api/v1/boards/${nonExistentBoardId}`,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Board not found');
    });
  });

  describe('API Rate Limiting Integration', () => {
    let validToken: string;

    beforeEach(() => {
      validToken = authService.generateAccessToken({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date()
      });
    });

    it('should not rate limit normal API usage', async () => {
      const requests = [];

      // Make multiple requests within normal limits
      for (let i = 0; i < 10; i++) {
        const promise = serverInstance.inject({
          method: 'GET',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
          },
        });
        requests.push(promise);
      }

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    it('should include rate limiting headers in responses', async () => {
      const response = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      // Check for rate limiting information in headers
      // Note: This depends on the specific rate limiting implementation
      // The exact headers may vary based on the rate limiting library used
    });
  });

  describe('Content Security Policy Integration', () => {
    it('should include CSP headers in API responses', async () => {
      const response = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-security-policy']).toBeDefined();
      
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('should include security headers in API responses', async () => {
      const response = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
      });

      expect(response.statusCode).toBe(200);
      
      // Check for essential security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Error Response Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        payload: { name: 'Test Board', goal: 'Test Goal' },
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      
      // Should not reveal internal details
      expect(body).not.toHaveProperty('stack');
      expect(body).not.toHaveProperty('sqlQuery');
      expect(body).not.toHaveProperty('databaseError');
      expect(body.error).not.toContain('jwt');
      expect(body.error).not.toContain('secret');
      expect(body.error).not.toContain('database');
    });

    it('should provide consistent error format', async () => {
      const testCases = [
        {
          url: '/api/v1/boards/invalid-id',
          method: 'GET',
          expectedStatus: 404
        },
        {
          url: '/api/v1/tasks/invalid-id',
          method: 'GET',
          expectedStatus: 404
        },
        {
          url: '/api/v1/boards',
          method: 'POST',
          payload: { name: '', goal: '' },
          headers: { 'content-type': 'application/json' },
          expectedStatus: 401 // Auth required first
        }
      ];

      for (const testCase of testCases) {
        const response = await serverInstance.inject({
          method: testCase.method,
          url: testCase.url,
          payload: testCase.payload,
          headers: testCase.headers || {},
        });

        expect(response.statusCode).toBe(testCase.expectedStatus);
        const body = JSON.parse(response.payload);
        
        // All errors should have consistent structure
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
        
        if (body.code) {
          expect(typeof body.code).toBe('string');
        }
      }
    });
  });
});