import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ValidationError } from '@kanban-mcp/errors';

// Initialize DOMPurify with JSDOM for Node.js environment
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

/**
 * Sanitization configuration for different content types
 */
export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
  maxLength?: number;
  allowMarkdown?: boolean;
}

/**
 * Default configuration for board/task content
 */
export const DEFAULT_CONTENT_CONFIG: SanitizationConfig = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'span'
  ],
  allowedAttributes: {
    'a': ['href', 'title'],
    'code': ['class'],
    'pre': ['class'],
    'span': ['class']
  },
  maxLength: 10000,
  allowMarkdown: true
};

/**
 * Strict configuration for titles and names
 */
export const STRICT_TEXT_CONFIG: SanitizationConfig = {
  allowedTags: [],
  allowedAttributes: {},
  maxLength: 200,
  allowMarkdown: false
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(
  content: string, 
  config: SanitizationConfig = DEFAULT_CONTENT_CONFIG
): string {
  if (typeof content !== 'string') {
    throw new ValidationError('Content must be a string');
  }

  // Check length before processing
  if (config.maxLength && content.length > config.maxLength) {
    throw new ValidationError(`Content exceeds maximum length of ${config.maxLength} characters`);
  }

  // Configure DOMPurify
  const sanitizeConfig: any = {};
  
  if (config.allowedTags) {
    sanitizeConfig.ALLOWED_TAGS = config.allowedTags;
  }
  
  if (config.allowedAttributes) {
    sanitizeConfig.ALLOWED_ATTR = Object.keys(config.allowedAttributes).reduce((acc, tag) => {
      return acc.concat(config.allowedAttributes![tag]);
    }, [] as string[]);
  }

  // Sanitize the content
  const sanitized = purify.sanitize(content, sanitizeConfig);
  
  return String(sanitized).trim();
}

/**
 * Sanitize plain text by removing all HTML and limiting length
 */
export function sanitizePlainText(
  text: string,
  maxLength: number = 200
): string {
  if (typeof text !== 'string') {
    throw new ValidationError('Text must be a string');
  }

  // Remove all HTML tags
  const cleaned = text.replace(/<[^>]*>/g, '').trim();
  
  // Check length
  if (cleaned.length > maxLength) {
    throw new ValidationError(`Text exceeds maximum length of ${maxLength} characters`);
  }

  return cleaned;
}

/**
 * Sanitize board/task title
 */
export function sanitizeTitle(title: string): string {
  return sanitizePlainText(title, 200);
}

/**
 * Sanitize board goal
 */
export function sanitizeGoal(goal: string): string {
  return sanitizeHtml(goal, {
    ...DEFAULT_CONTENT_CONFIG,
    maxLength: 1000
  });
}

/**
 * Sanitize task content (supports markdown-like formatting)
 */
export function sanitizeContent(content: string): string {
  return sanitizeHtml(content, DEFAULT_CONTENT_CONFIG);
}

/**
 * Sanitize column name
 */
export function sanitizeColumnName(name: string): string {
  return sanitizePlainText(name, 100);
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = email.trim().toLowerCase();
  
  if (!emailRegex.test(cleaned)) {
    throw new ValidationError('Invalid email format');
  }
  
  return cleaned;
}

/**
 * Sanitize URL inputs
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError('Only HTTP and HTTPS URLs are allowed');
    }
    
    return parsed.toString();
  } catch (error) {
    throw new ValidationError('Invalid URL format');
  }
}

/**
 * Comprehensive input sanitization function
 */
export function sanitizeInput(
  input: any,
  type: 'title' | 'content' | 'goal' | 'columnName' | 'email' | 'url' | 'text' = 'text'
): string {
  if (input === null || input === undefined) {
    throw new ValidationError('Input cannot be null or undefined');
  }

  const stringInput = String(input);

  switch (type) {
    case 'title':
      return sanitizeTitle(stringInput);
    case 'content':
      return sanitizeContent(stringInput);
    case 'goal':
      return sanitizeGoal(stringInput);
    case 'columnName':
      return sanitizeColumnName(stringInput);
    case 'email':
      return sanitizeEmail(stringInput);
    case 'url':
      return sanitizeUrl(stringInput);
    case 'text':
    default:
      return sanitizePlainText(stringInput);
  }
}

/**
 * Batch sanitize an object with multiple fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldConfigs: Record<keyof T, 'title' | 'content' | 'goal' | 'columnName' | 'email' | 'url' | 'text'>
): T {
  const sanitized = { ...obj } as T;

  for (const [field, type] of Object.entries(fieldConfigs)) {
    const fieldKey = field as keyof T;
    if (sanitized[fieldKey] !== undefined && sanitized[fieldKey] !== null) {
      try {
        (sanitized as any)[fieldKey] = sanitizeInput(sanitized[fieldKey], type as any);
      } catch (error) {
        throw new ValidationError(`Invalid ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return sanitized;
}