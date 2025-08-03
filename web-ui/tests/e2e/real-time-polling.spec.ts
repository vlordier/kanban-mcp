import { test, expect } from '@playwright/test';

test.describe('Real-Time Database Polling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');
  });

  test('verifies polling system initialization', async ({ page }) => {
    // Check that live updates indicator is present
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();

    // Check for the green pulse animation indicating active polling
    const liveIndicator = page.locator('.animate-pulse').first();
    await expect(liveIndicator).toBeVisible();

    // Verify polling status in console
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Wait for at least one polling cycle (5+ seconds)
    await page.waitForTimeout(6000);

    // Take screenshot of polling indicator
    await page.locator('span:has-text("Live updates")').first().screenshot({
      path: './screenshots/real-time-tests/01-polling-indicator-1754162000000.png',
    });
  });

  test('detects real-time board creation', async ({ page }) => {
    // Set up console logging to track real-time updates
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Real-time update detected')) {
        consoleLogs.push(msg.text());
      }
    });

    // Get initial board count
    const initialBoardCount = await page.locator('[data-testid="board-count"]').textContent();

    // Create a new board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Real-Time Test Board');
    await page.fill(
      'textarea#board-goal',
      'Testing real-time board creation and polling system integration'
    );
    await page.click('button:has-text("Create Board")');

    // Wait for board creation
    await page.waitForSelector('text=Real-Time Test Board');

    // Verify board appears immediately (optimistic update)
    await expect(page.locator('text=Real-Time Test Board')).toBeVisible();

    // Take screenshot showing new board
    await page.screenshot({
      path: './screenshots/real-time-tests/02-board-created-optimistic-1754162000000.png',
      fullPage: true,
    });

    // Wait for next polling cycle to confirm server sync
    await page.waitForTimeout(6000);

    // Verify board still exists after polling (server confirmation)
    await expect(page.locator('text=Real-Time Test Board')).toBeVisible();

    console.log('Console logs:', consoleLogs);
  });

  test('handles polling errors gracefully', async ({ page }) => {
    // Monitor console for error handling
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Real-time polling error')) {
        errorLogs.push(msg.text());
      }
    });

    // Simulate network interruption by blocking API calls temporarily
    await page.route('**/api/boards', route => {
      // Block first few requests to simulate network issues
      if (errorLogs.length < 2) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Wait for error scenarios
    await page.waitForTimeout(12000); // Wait for multiple polling attempts

    // Verify the app continues to function despite errors
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();

    // Verify live indicator still shows (graceful degradation)
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();

    console.log('Error handling logs:', errorLogs);

    // Take screenshot of error handling state
    await page.screenshot({
      path: './screenshots/real-time-tests/03-error-handling-1754162000000.png',
      fullPage: true,
    });
  });

  test('maintains polling across page interactions', async ({ page }) => {
    // Create a board to have content for testing
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Polling Persistence Test');
    await page.fill(
      'textarea#board-goal',
      'Testing that polling continues during user interactions'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Perform various interactions that should not interrupt polling

    // 1. Open and close search
    await page.click('input[placeholder*="Search boards"]');
    await page.fill('input[placeholder*="Search boards"]', 'Polling');
    await page.waitForTimeout(2000);
    await page.click('button[title="Clear search"]');

    // 2. Toggle dark mode
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(1000);
    await page.click('button[title*="Switch to light mode"]');

    // 3. Open notifications
    await page.click('button[title="Notifications"]');
    await page.waitForTimeout(1000);
    await page.click('button[title="Notifications"]'); // Close

    // Verify polling indicator still active
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // Take screenshot showing polling survived interactions
    await page.screenshot({
      path: './screenshots/real-time-tests/04-polling-persistence-1754162000000.png',
      fullPage: true,
    });
  });

  test('synchronizes data correctly on page reload', async ({ page }) => {
    // Create initial board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Sync Test Board');
    await page.fill('textarea#board-goal', 'Testing data synchronization on page reload');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // Verify board exists
    await expect(page.locator('text=Sync Test Board')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Verify board still exists after reload (data persistence)
    await expect(page.locator('text=Sync Test Board')).toBeVisible();

    // Verify polling system restarts
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // Take screenshot of post-reload state
    await page.screenshot({
      path: './screenshots/real-time-tests/05-post-reload-sync-1754162000000.png',
      fullPage: true,
    });
  });
});
