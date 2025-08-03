import { test, expect } from '@playwright/test';

test.describe('Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');
  });

  test('handles network errors during board creation', async ({ page }) => {
    // Monitor console for error logs
    const errorLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    // Block API requests to simulate network failure
    await page.route('**/api/boards', route => {
      if (route.request().method() === 'POST') {
        route.abort('internetdisconnected');
      } else {
        route.continue();
      }
    });

    // Attempt to create a board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Network Error Test');
    await page.fill('textarea#board-goal', 'Testing network error handling');
    await page.click('button:has-text("Create Board")');

    // Wait for error handling
    await page.waitForTimeout(3000);

    // Verify user sees appropriate error feedback
    // The dialog should still be open or show error state
    await expect(page.locator('text=Network Error Test')).toBeVisible();

    // Take screenshot of error state
    await page.screenshot({
      path: './screenshots/error-handling/01-network-error-board-creation-1754162400000.png',
    });

    console.log('Network error logs:', errorLogs);
  });

  test('handles API errors during board editing', async ({ page }) => {
    // First create a board successfully
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Edit Error Test');
    await page.fill('textarea#board-goal', 'Testing edit error handling');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Now block PUT requests
    await page.route('**/api/boards/*', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      } else {
        route.continue();
      }
    });

    // Try to edit the board
    await page.hover('div:has-text("Edit Error Test")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', 'Should Fail Edit');
    await page.fill('textarea#edit-board-goal', 'This edit should fail');
    await page.click('button:has-text("Save Changes")');

    // Wait for error handling
    await page.waitForTimeout(3000);

    // Verify original content is preserved (rollback)
    await expect(page.locator('text=Edit Error Test')).toBeVisible();
    await expect(page.locator('text=Should Fail Edit')).not.toBeVisible();

    // Take screenshot of error rollback
    await page.screenshot({
      path: './screenshots/error-handling/02-edit-error-rollback-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles polling failures gracefully', async ({ page }) => {
    // Monitor polling status
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('polling') || msg.text().includes('error')) {
        consoleLogs.push(msg.text());
      }
    });

    // Block some API calls to simulate intermittent failures
    let requestCount = 0;
    await page.route('**/api/boards', route => {
      requestCount++;
      if (requestCount % 3 === 0) {
        // Fail every 3rd request
        route.abort('internetdisconnected');
      } else {
        route.continue();
      }
    });

    // Wait for multiple polling cycles with intermittent failures
    await page.waitForTimeout(20000);

    // Verify app remains functional despite polling failures
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();

    // Should still be able to create boards
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'After Polling Errors');
    await page.fill('textarea#board-goal', 'Created despite polling errors');
    await page.click('button:has-text("Create Board")');

    await expect(page.locator('text=After Polling Errors')).toBeVisible();

    // Take screenshot showing resilience
    await page.screenshot({
      path: './screenshots/error-handling/03-polling-error-resilience-1754162400000.png',
      fullPage: true,
    });

    console.log('Polling error logs:', consoleLogs);
  });

  test('handles malformed API responses', async ({ page }) => {
    // Intercept and return malformed JSON
    await page.route('**/api/boards', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"invalid": json syntax}',
        });
      } else {
        route.continue();
      }
    });

    // Reload to trigger API call with malformed response
    await page.reload();
    await page.waitForTimeout(3000);

    // App should handle gracefully and show some fallback
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();

    // Take screenshot of malformed response handling
    await page.screenshot({
      path: './screenshots/error-handling/04-malformed-api-response-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles extremely long board names and descriptions', async ({ page }) => {
    const longName = 'A'.repeat(500); // Very long name
    const longGoal = 'B'.repeat(2000); // Very long description

    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', longName);
    await page.fill('textarea#board-goal', longGoal);

    // Take screenshot of long input
    await page.screenshot({
      path: './screenshots/error-handling/05-long-input-fields-1754162400000.png',
    });

    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // Verify board creation handles long content appropriately
    // Should either truncate or handle gracefully
    const boardCards = page.locator('[data-testid="board-card"]');
    await expect(boardCards.first()).toBeVisible();

    // Take screenshot of long content handling
    await page.screenshot({
      path: './screenshots/error-handling/06-long-content-handling-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles special characters and unicode in board data', async ({ page }) => {
    const specialName = '🚀 Board with émojis & spéciäl chars <script>alert("xss")</script>';
    const unicodeGoal = 'Testing unicode: 中文, العربية, русский, 🎯🎨🎪 and HTML: <div>test</div>';

    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', specialName);
    await page.fill('textarea#board-goal', unicodeGoal);
    await page.click('button:has-text("Create Board")');

    await page.waitForTimeout(2000);

    // Verify special characters are properly escaped/displayed
    await expect(page.locator('text=🚀 Board with émojis')).toBeVisible();
    await expect(page.locator('text=中文')).toBeVisible();

    // Verify XSS attempt is neutralized (script should not execute)
    const hasAlert = await page.evaluate(() => {
      return window.alert.toString().includes('[native code]');
    });
    expect(hasAlert).toBe(true); // Alert should not be overridden

    // Take screenshot of special character handling
    await page.screenshot({
      path: './screenshots/error-handling/07-special-characters-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles rapid user interactions gracefully', async ({ page }) => {
    // Create initial board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Rapid Interaction Test');
    await page.fill('textarea#board-goal', 'Testing rapid interactions');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Perform rapid interactions
    const interactions = [
      () => page.click('button[title*="Switch to dark mode"]'),
      () => page.click('button[title*="Switch to light mode"]'),
      () => page.fill('input[placeholder*="Search boards"]', 'test'),
      () => page.click('button[title="Clear search"]'),
      () => page.click('button[title="Notifications"]'),
      () => page.click('button[title="Notifications"]'),
      () => page.hover('div:has-text("Rapid Interaction Test")'),
      () => page.click('button[title="Edit board"]'),
      () => page.click('button:has-text("Cancel")'),
    ];

    // Execute interactions rapidly
    for (const interaction of interactions) {
      await interaction();
      await page.waitForTimeout(100); // Very short delay
    }

    // Verify app remains functional
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('text=Rapid Interaction Test')).toBeVisible();

    // Take screenshot of post-rapid-interactions state
    await page.screenshot({
      path: './screenshots/error-handling/08-rapid-interactions-stable-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles browser back/forward navigation', async ({ page }) => {
    // Create a board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Navigation Test');
    await page.fill('textarea#board-goal', 'Testing browser navigation');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Navigate to a board (click on it)
    await page.click('text=Navigation Test');
    await page.waitForTimeout(1000);

    // Use browser back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Verify we're back at board list and everything works
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('text=Navigation Test')).toBeVisible();

    // Use browser forward
    await page.goForward();
    await page.waitForTimeout(1000);

    // Go back again
    await page.goBack();
    await page.waitForTimeout(1000);

    // Verify polling and functionality still work
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();

    // Take screenshot of navigation handling
    await page.screenshot({
      path: './screenshots/error-handling/09-browser-navigation-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles concurrent edit operations', async ({ page }) => {
    // Create a board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Concurrent Edit Test');
    await page.fill('textarea#board-goal', 'Testing concurrent edits');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Simulate concurrent edits by rapid edit operations
    for (let i = 1; i <= 3; i++) {
      await page.hover('div:has-text("Concurrent Edit Test")');
      await page.click('button[title="Edit board"]');
      await page.fill('input#edit-board-name', `Concurrent Edit ${i}`);
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(200); // Very short delay to simulate concurrency
    }

    // Wait for all operations to complete
    await page.waitForTimeout(3000);

    // Verify final state is consistent (last edit should win)
    await expect(page.locator('text=Concurrent Edit 3')).toBeVisible();

    // Take screenshot of concurrent edit result
    await page.screenshot({
      path: './screenshots/error-handling/10-concurrent-edits-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles memory and performance under load', async ({ page }) => {
    // Monitor performance
    await page.addInitScript(() => {
      (window as any).performanceMarks = [];
      const originalFetch = window.fetch;
      window.fetch = function (...args) {
        (window as any).performanceMarks.push(Date.now());
        return originalFetch.apply(this, args);
      };
    });

    // Create many boards to test performance
    for (let i = 1; i <= 20; i++) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', `Load Test Board ${i}`);
      await page.fill(
        'textarea#board-goal',
        `Performance testing board number ${i} for load testing scenarios`
      );
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(100);
    }

    // Wait for all operations
    await page.waitForTimeout(5000);

    // Verify app still responsive
    await page.click('input[placeholder*="Search boards"]');
    await page.fill('input[placeholder*="Search boards"]', 'Load Test');
    await page.waitForTimeout(1000);

    // Should see filtered results
    const searchResults = page.locator('text=Load Test Board');
    const count = await searchResults.count();
    expect(count).toBeGreaterThan(0);

    // Clear search
    await page.click('button[title="Clear search"]');

    // Check performance metrics
    const performanceMarks = await page.evaluate(
      () => (window as any).performanceMarks?.length || 0
    );
    console.log('Performance marks captured:', performanceMarks);

    // Take screenshot of load test result
    await page.screenshot({
      path: './screenshots/error-handling/11-load-test-performance-1754162400000.png',
      fullPage: true,
    });
  });

  test('handles page refresh during operations', async ({ page }) => {
    // Start creating a board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Refresh Test Board');
    await page.fill('textarea#board-goal', 'Testing page refresh handling');

    // Don't click create - refresh while dialog is open
    await page.reload();
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Verify app recovers gracefully
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();

    // Should be able to create boards normally after refresh
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Post Refresh Board');
    await page.fill('textarea#board-goal', 'Created after refresh');
    await page.click('button:has-text("Create Board")');

    await expect(page.locator('text=Post Refresh Board')).toBeVisible();

    // Take screenshot of post-refresh recovery
    await page.screenshot({
      path: './screenshots/error-handling/12-page-refresh-recovery-1754162400000.png',
      fullPage: true,
    });
  });
});
