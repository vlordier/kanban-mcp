import { 
  sanitizeInput, 
  sanitizeTitle, 
  sanitizeContent, 
  sanitizeObject 
} from '../src/common/sanitization';
import { ValidationError } from '@kanban-mcp/errors';

describe('Input Sanitization', () => {
  describe('sanitizeTitle', () => {
    it('removes HTML tags from titles', () => {
      const maliciousTitle = '<script>alert("xss")</script>My Board';
      const sanitized = sanitizeTitle(maliciousTitle);
      expect(sanitized).toBe('alert("xss")My Board');
      expect(sanitized).not.toContain('<script>');
    });

    it('limits title length', () => {
      const longTitle = 'a'.repeat(300);
      expect(() => sanitizeTitle(longTitle)).toThrow(ValidationError);
    });

    it('preserves safe text', () => {
      const safeTitle = 'My Project Board';
      expect(sanitizeTitle(safeTitle)).toBe(safeTitle);
    });
  });

  describe('sanitizeContent', () => {
    it('allows safe HTML tags', () => {
      const content = '<p>This is <strong>important</strong> content</p>';
      const sanitized = sanitizeContent(content);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });

    it('removes dangerous HTML', () => {
      const dangerousContent = '<script>malicious()</script><p>Safe content</p>';
      const sanitized = sanitizeContent(dangerousContent);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('removes javascript: URLs', () => {
      const maliciousLink = '<a href="javascript:alert(\'xss\')">Click me</a>';
      const sanitized = sanitizeContent(maliciousLink);
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes multiple fields in an object', () => {
      const input = {
        title: '<script>alert("title")</script>Board Title',
        content: '<p>Good content</p><script>bad()</script>',
        description: 'Safe description'
      };

      const sanitized = sanitizeObject(input, {
        title: 'title',
        content: 'content',
        description: 'text'
      });

      expect(sanitized.title).not.toContain('<script>');
      expect(sanitized.content).toContain('<p>Good content</p>');
      expect(sanitized.content).not.toContain('<script>');
      expect(sanitized.description).toBe('Safe description');
    });
  });

  describe('XSS Prevention', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="javascript:alert(\'xss\')"></object>',
      '<embed src="javascript:alert(\'xss\')">',
      '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
      '<style>@import "javascript:alert(\'xss\')"</style>',
      '"><script>alert("xss")</script>'
    ];

    xssAttempts.forEach((xss, index) => {
      it(`prevents XSS attempt ${index + 1}: ${xss.substring(0, 30)}...`, () => {
        const sanitizedTitle = sanitizeTitle(`Safe Title ${xss}`);
        const sanitizedContent = sanitizeContent(`<p>Safe content</p> ${xss}`);

        expect(sanitizedTitle).not.toContain('javascript:');
        expect(sanitizedTitle).not.toContain('<script>');
        expect(sanitizedTitle).not.toContain('onerror');
        expect(sanitizedTitle).not.toContain('onload');

        expect(sanitizedContent).not.toContain('javascript:');
        expect(sanitizedContent).not.toContain('<script>');
        expect(sanitizedContent).not.toContain('onerror');
        expect(sanitizedContent).not.toContain('onload');
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlAttempts = [
      "'; DROP TABLE boards; --",
      "' OR '1'='1",
      "'; UPDATE boards SET name='hacked'; --",
      "' UNION SELECT * FROM users; --"
    ];

    sqlAttempts.forEach((sql, index) => {
      it(`sanitizes SQL injection attempt ${index + 1}`, () => {
        const input = `Board Name ${sql}`;
        const sanitized = sanitizeTitle(input);
        
        // Should not contain SQL keywords as HTML
        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('UNION SELECT');
        expect(sanitized).not.toContain('UPDATE');
        
        // The input is treated as plain text, so SQL becomes harmless
        expect(typeof sanitized).toBe('string');
      });
    });
  });
});