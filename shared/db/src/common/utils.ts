// Common utilities for database operations

// Simple retry function with exponential backoff
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i === maxRetries - 1) break;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  throw lastError!;
}

// Simple logger for standalone operation
export const logger = {
  info: (message: string, meta?: any, tag?: string): void => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any, error?: Error, tag?: string): void => console.error(`[ERROR] ${message}`, meta || '', error || ''),
  warn: (message: string, meta?: any, tag?: string): void => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any, tag?: string): void => console.debug(`[DEBUG] ${message}`, meta || '')
};