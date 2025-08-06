import { sanitizeInput, sanitizeTitle } from '../src/common/sanitization';
import { ValidationError } from '@kanban-mcp/errors';

describe('Basic Sanitization', () => {
  it('removes script tags from titles', () => {
    const input = '<script>alert("bad")</script>Safe Title';
    const result = sanitizeTitle(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('Safe Title');
  });

  it('throws error for overly long input', () => {
    const longInput = 'a'.repeat(300);
    expect(() => sanitizeTitle(longInput)).toThrow(ValidationError);
  });

  it('sanitizes different input types correctly', () => {
    expect(sanitizeInput('Test Title', 'title')).toBe('Test Title');
    expect(sanitizeInput('<p>Good content</p>', 'content')).toContain('<p>Good content</p>');
  });
});