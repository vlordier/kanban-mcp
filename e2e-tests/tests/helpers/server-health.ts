/**
 * Reliable server health check utilities for test environment
 * Replaces unreliable setTimeout waits with proper health endpoint polling
 */

export interface ServerHealthOptions {
  port: number;
  timeout?: number;
  interval?: number;
  healthEndpoint?: string;
}

/**
 * Wait for server to be ready by polling health endpoint
 * Much more reliable than setTimeout waits
 */
export async function waitForServer(options: ServerHealthOptions): Promise<void> {
  const {
    port,
    timeout = 30000,
    interval = 500,
    healthEndpoint = '/'
  } = options;

  const startTime = Date.now();
  const baseUrl = `http://localhost:${port}`;
  const healthUrl = `${baseUrl}${healthEndpoint}`;

  console.log(`🔍 Waiting for server at ${baseUrl} to be ready...`);

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'E2E-Test-Client'
        }
      });

      if (response.status === 200) {
        console.log(`✅ Server at ${baseUrl} is ready (${Date.now() - startTime}ms)`);
        return;
      }

      console.log(`⏳ Server responded with status ${response.status}, retrying...`);
    } catch (error) {
      // Server not ready yet, this is expected
      console.log(`⏳ Server not ready (${error instanceof Error ? error.message : 'unknown error'}), retrying...`);
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`❌ Server at ${baseUrl} did not become ready within ${timeout}ms`);
}

/**
 * Wait for API endpoint to be available and return expected data
 * Useful for checking specific API functionality
 */
export async function waitForApiEndpoint(
  port: number, 
  endpoint: string, 
  options: { timeout?: number; expectedStatus?: number } = {}
): Promise<Response> {
  const { timeout = 15000, expectedStatus = 200 } = options;
  const startTime = Date.now();
  
  const url = `http://localhost:${port}${endpoint}`;
  console.log(`🔍 Waiting for API endpoint ${url} to be ready...`);

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.status === expectedStatus) {
        console.log(`✅ API endpoint ${url} is ready (${Date.now() - startTime}ms)`);
        return response;
      }

      console.log(`⏳ API endpoint responded with status ${response.status}, expected ${expectedStatus}, retrying...`);
    } catch (error) {
      console.log(`⏳ API endpoint not ready (${error instanceof Error ? error.message : 'unknown error'}), retrying...`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`❌ API endpoint ${url} did not become ready within ${timeout}ms`);
}

/**
 * Check if server is healthy and responsive
 * Returns detailed health information
 */
export async function checkServerHealth(port: number): Promise<{
  healthy: boolean;
  responseTime: number;
  status: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    return {
      healthy: response.status === 200,
      responseTime: Date.now() - startTime,
      status: response.status
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Enhanced server readiness check with retries and exponential backoff
 * More sophisticated than basic polling
 */
export async function waitForServerWithBackoff(
  port: number,
  options: {
    timeout?: number;
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<void> {
  const {
    timeout = 30000,
    maxRetries = 20,
    initialDelay = 100,
    maxDelay = 2000,
    backoffFactor = 1.5
  } = options;

  const startTime = Date.now();
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Server readiness timeout after ${timeout}ms`);
    }

    const health = await checkServerHealth(port);
    
    if (health.healthy) {
      console.log(`✅ Server ready after ${attempt} attempts (${Date.now() - startTime}ms)`);
      return;
    }

    console.log(`⏳ Attempt ${attempt}/${maxRetries}: Server not ready (status: ${health.status}), waiting ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * backoffFactor, maxDelay);
  }

  throw new Error(`Server did not become ready after ${maxRetries} attempts`);
}