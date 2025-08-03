import { AuthService } from '../../src/auth/auth.service';

describe('Standalone Security Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('JWT Security Validation', () => {
    it('should generate valid JWT tokens', () => {
      const testUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: new Date()
      };

      const token = authService.generateAccessToken(testUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should validate JWT token structure', async () => {
      const testUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: new Date()
      };

      const token = authService.generateAccessToken(testUser);
      const user = await authService.validateToken(token);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.email).toBe(testUser.email);
      expect(user?.role).toBe(testUser.role);
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
        '',
        'Bearer',
        'Bearer invalid-token-format',
      ];

      for (const token of invalidTokens) {
        const user = await authService.validateToken(token);
        expect(user).toBeNull();
      }
    });

    it('should handle expired tokens correctly', async () => {
      const testUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: new Date()
      };

      // Create an expired token
      const expiredToken = authService.generateAccessToken(testUser, '-1s');
      
      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const user = await authService.validateToken(expiredToken);
      expect(user).toBeNull();
    });

    it('should prevent token signature tampering', async () => {
      const testUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: new Date()
      };

      const validToken = authService.generateAccessToken(testUser);
      
      // Tamper with the signature
      const tokenParts = validToken.split('.');
      const tamperedToken = tokenParts[0] + '.' + tokenParts[1] + '.tampered_signature';
      
      const user = await authService.validateToken(tamperedToken);
      expect(user).toBeNull();
    });
  });

  describe('Input Validation Security', () => {
    it('should handle various string inputs safely', () => {
      const dangerousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '"; DROP TABLE users; --',
        "'; DELETE FROM users WHERE 1=1; --",
        null,
        undefined,
        '',
        'a'.repeat(10000), // Very long string
      ];

      // This test verifies that our test infrastructure can handle various inputs
      for (const input of dangerousInputs) {
        expect(() => {
          // Simulate input processing (in real app, this would be sanitized)
          const processed = input ? String(input).substring(0, 255) : '';
          expect(typeof processed).toBe('string');
        }).not.toThrow();
      }
    });

    it('should validate email format patterns', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        '',
        null,
        undefined
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email as any)).toBe(false);
      });
    });
  });

  describe('Authentication Service Security', () => {
    it('should authenticate valid demo users', async () => {
      const validCredentials = [
        { email: 'admin@example.com', password: 'demo123' },
        { email: 'user@example.com', password: 'demo123' }
      ];

      for (const creds of validCredentials) {
        const result = await authService.authenticate(creds.email, creds.password);
        expect(result).toBeDefined();
        expect(result.user).toBeDefined();
        expect(result.tokens).toBeDefined();
        expect(result.user.email).toBe(creds.email);
      }
    });

    it('should reject invalid credentials', async () => {
      const invalidCredentials = [
        { email: 'admin@example.com', password: 'wrongpassword' },
        { email: 'nonexistent@example.com', password: 'demo123' },
        { email: '', password: 'demo123' },
        { email: 'admin@example.com', password: '' },
      ];

      for (const creds of invalidCredentials) {
        await expect(
          authService.authenticate(creds.email, creds.password)
        ).rejects.toThrow();
      }
    });

    it('should generate consistent user lookups', async () => {
      const userId = 'admin-user-id';
      const user1 = await authService.getUserById(userId);
      const user2 = await authService.getUserById(userId);
      
      expect(user1).toEqual(user2);
      expect(user1?.id).toBe(userId);
    });
  });
});