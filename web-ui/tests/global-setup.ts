import { test as setup } from '@playwright/test';

// Global setup - this runs once before all tests
setup('global setup', async () => {
  // Any global setup logic can go here
  console.log('Running global E2E test setup with mocked API...');
});
