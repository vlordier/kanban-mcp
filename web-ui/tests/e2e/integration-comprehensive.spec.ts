import { test, expect } from '@playwright/test';

test.describe('Comprehensive Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');
  });

  test('full workflow: create, edit, notifications, and real-time updates', async ({ page }) => {
    // Set up comprehensive monitoring
    await page.addInitScript(() => {
      (window as any).testEvents = {
        boardsUpdated: [],
        notifications: [],
        apiCalls: []
      };
      
      window.addEventListener('boardsUpdated', (event: any) => {
        (window as any).testEvents.boardsUpdated.push({
          timestamp: Date.now(),
          changes: event.detail.changes,
          changeCount: event.detail.changes.length
        });
        console.log('Integration test - boardsUpdated:', event.detail);
      });

      // Monitor fetch calls
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        (window as any).testEvents.apiCalls.push({
          timestamp: Date.now(),
          url: args[0],
          method: args[1]?.method || 'GET'
        });
        return originalFetch.apply(this, args);
      };
    });

    // Step 1: Verify initial state
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // Step 2: Create first board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Integration Test Board 1');
    await page.fill('textarea#board-goal', '🚀 Full integration testing with real-time features, notifications, and editing capabilities');
    await page.click('button:has-text("Create Board")');
    
    // Verify immediate optimistic update
    await expect(page.locator('text=Integration Test Board 1')).toBeVisible();
    await expect(page.locator('text=🚀 Full integration testing')).toBeVisible();

    // Step 3: Wait for server sync and check notifications
    await page.waitForTimeout(3000);
    await page.click('button[title="Notifications"]');
    await expect(page.locator('text=New board created')).toBeVisible();
    await expect(page.locator('text=Integration Test Board 1')).toBeVisible();
    await page.click('button[title="Notifications"]'); // Close

    // Step 4: Create second board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Integration Test Board 2');
    await page.fill('textarea#board-goal', '⚡ Second board for testing multi-board scenarios and concurrent operations');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // Step 5: Edit first board
    await page.hover('div:has-text("Integration Test Board 1")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', '🎯 Updated Integration Test Board');
    await page.fill('textarea#edit-board-goal', '✨ Updated goal with new features and comprehensive testing coverage for all scenarios');
    await page.click('button:has-text("Save Changes")');
    
    // Verify edit took effect
    await expect(page.locator('text=🎯 Updated Integration Test Board')).toBeVisible();
    await expect(page.locator('text=✨ Updated goal')).toBeVisible();

    // Step 6: Verify edit notification
    await page.waitForTimeout(3000);
    await page.click('button[title="Notifications"]');
    await expect(page.locator('text=Board updated')).toBeVisible();
    await expect(page.locator('text=🎯 Updated Integration Test Board')).toBeVisible();

    // Step 7: Test search functionality
    await page.click('button[title="Notifications"]'); // Close notifications
    await page.fill('input[placeholder*="Search boards"]', 'Updated');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=🎯 Updated Integration Test Board')).toBeVisible();
    await expect(page.locator('text=Integration Test Board 2')).not.toBeVisible();

    // Clear search
    await page.click('button[title="Clear search"]');
    await expect(page.locator('text=Integration Test Board 2')).toBeVisible();

    // Step 8: Test dark mode with all features
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);
    
    // Verify all elements work in dark mode
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();
    await page.click('button[title="Notifications"]');
    await expect(page.locator('text=Board updated')).toBeVisible();
    await page.click('button[title="Notifications"]');

    // Edit in dark mode
    await page.hover('div:has-text("Integration Test Board 2")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', '🌙 Dark Mode Test Board');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=🌙 Dark Mode Test Board')).toBeVisible();

    // Step 9: Test rapid operations
    const rapidEdits = [
      '🔥 Rapid Edit 1',
      '⚡ Rapid Edit 2', 
      '🚀 Rapid Edit Final'
    ];

    for (const editName of rapidEdits) {
      await page.hover('div:has-text("🎯 Updated Integration Test Board")');
      await page.click('button[title="Edit board"]');
      await page.fill('input#edit-board-name', editName);
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(500);
    }

    // Verify final state
    await expect(page.locator('text=🚀 Rapid Edit Final')).toBeVisible();

    // Step 10: Wait for polling cycles and verify consistency
    await page.waitForTimeout(8000);
    await expect(page.locator('text=🚀 Rapid Edit Final')).toBeVisible();
    await expect(page.locator('text=🌙 Dark Mode Test Board')).toBeVisible();

    // Step 11: Check all monitoring data
    const testEvents = await page.evaluate(() => (window as any).testEvents);
    console.log('Integration test events:', {
      boardUpdates: testEvents.boardsUpdated.length,
      apiCalls: testEvents.apiCalls.length,
      totalChanges: testEvents.boardsUpdated.reduce((sum: number, event: any) => sum + event.changeCount, 0)
    });

    // Verify we captured update events
    expect(testEvents.boardsUpdated.length).toBeGreaterThan(0);
    expect(testEvents.apiCalls.length).toBeGreaterThan(0);

    // Take final screenshot
    await page.screenshot({
      path: './screenshots/integration/01-full-workflow-complete-1754162500000.png',
      fullPage: true
    });
  });

  test('stress test: multiple concurrent operations', async ({ page }) => {
    // Set up stress test monitoring
    await page.addInitScript(() => {
      (window as any).stressTest = {
        operations: [],
        errors: [],
        startTime: Date.now()
      };

      window.addEventListener('boardsUpdated', (event: any) => {
        (window as any).stressTest.operations.push({
          type: 'update',
          timestamp: Date.now(),
          changeCount: event.detail.changes.length
        });
      });

      window.addEventListener('error', (event) => {
        (window as any).stressTest.errors.push({
          message: event.message,
          timestamp: Date.now()
        });
      });
    });

    // Create multiple boards rapidly
    const boardCount = 8;
    for (let i = 1; i <= boardCount; i++) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', `Stress Test Board ${i}`);
      await page.fill('textarea#board-goal', `Stress testing board ${i} with concurrent operations and real-time updates`);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(200);
    }

    // Wait for all creations to process
    await page.waitForTimeout(5000);

    // Perform concurrent edits
    for (let i = 1; i <= 4; i++) {
      await page.hover(`div:has-text("Stress Test Board ${i}")`);
      await page.click('button[title="Edit board"]');
      await page.fill('input#edit-board-name', `✅ Edited Stress Board ${i}`);
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(300);
    }

    // Perform concurrent searches
    const searchTerms = ['Stress', 'Edited', 'Board', 'Test'];
    for (const term of searchTerms) {
      await page.fill('input[placeholder*="Search boards"]', term);
      await page.waitForTimeout(500);
      await page.click('button[title="Clear search"]');
      await page.waitForTimeout(200);
    }

    // Toggle modes rapidly
    for (let i = 0; i < 3; i++) {
      await page.click('button[title*="Switch to dark mode"]');
      await page.waitForTimeout(300);
      await page.click('button[title*="Switch to light mode"]');
      await page.waitForTimeout(300);
    }

    // Open/close notifications rapidly
    for (let i = 0; i < 4; i++) {
      await page.click('button[title="Notifications"]');
      await page.waitForTimeout(200);
      await page.click('button[title="Notifications"]');
      await page.waitForTimeout(200);
    }

    // Wait for all operations to settle
    await page.waitForTimeout(10000);

    // Verify system stability 
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();

    // Verify edited boards are visible
    await expect(page.locator('text=✅ Edited Stress Board 1')).toBeVisible();
    await expect(page.locator('text=✅ Edited Stress Board 2')).toBeVisible();

    // Check stress test results
    const stressResults = await page.evaluate(() => (window as any).stressTest);
    console.log('Stress test results:', {
      operations: stressResults.operations.length,
      errors: stressResults.errors.length,
      duration: Date.now() - stressResults.startTime
    });

    expect(stressResults.errors.length).toBe(0); // No errors should occur

    // Take screenshot of stress test completion
    await page.screenshot({
      path: './screenshots/integration/02-stress-test-complete-1754162500000.png',
      fullPage: true
    });
  });

  test('end-to-end user journey with all features', async ({ page }) => {
    // Simulate a realistic user journey

    // 1. User arrives and sees the interface
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('span:has-text("Live updates")')).toBeVisible();

    // 2. User creates their first project board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', '🎯 Q1 Product Roadmap');
    await page.fill('textarea#board-goal', '📋 Define and track key product initiatives for Q1 including feature releases, improvements, and strategic goals');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // 3. User creates a second board for a different project
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', '🔧 Technical Debt Cleanup');
    await page.fill('textarea#board-goal', '⚡ Address technical debt, refactor legacy code, and improve system performance and maintainability');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // 4. User checks notifications to see their activity
    await page.click('button[title="Notifications"]');
    await expect(page.locator('text=New board created')).toHaveCount(2);
    await page.click('button[title="Notifications"]');

    // 5. User realizes they need to update the roadmap board
    await page.hover('div:has-text("🎯 Q1 Product Roadmap")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', '🚀 Q1 Product Roadmap - Updated');
    await page.fill('textarea#edit-board-goal', '📈 Updated roadmap with latest priorities: mobile app launch, API improvements, and user experience enhancements');
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // 6. User prefers dark mode for better focus
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);

    // 7. User searches for specific boards
    await page.fill('input[placeholder*="Search boards"]', 'Technical');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=🔧 Technical Debt Cleanup')).toBeVisible();
    await expect(page.locator('text=🚀 Q1 Product Roadmap')).not.toBeVisible();

    // 8. User clears search to see all boards
    await page.click('button[title="Clear search"]');
    await expect(page.locator('text=🚀 Q1 Product Roadmap - Updated')).toBeVisible();

    // 9. User checks notifications again to see the edit
    await page.click('button[title="Notifications"]');
    await expect(page.locator('text=Board updated')).toBeVisible();
    await expect(page.locator('text=🚀 Q1 Product Roadmap - Updated')).toBeVisible();

    // 10. User creates a third board for immediate needs
    await page.click('button[title="Notifications"]'); // Close notifications
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', '🔥 Hot Fixes & Urgent Tasks');
    await page.fill('textarea#board-goal', '⚠️ Critical issues that need immediate attention and quick resolution');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // 11. User switches back to light mode
    await page.click('button[title*="Switch to light mode"]');
    await page.waitForTimeout(500);

    // 12. User does a final check of their boards
    const boardTitles = [
      '🚀 Q1 Product Roadmap - Updated',
      '🔧 Technical Debt Cleanup', 
      '🔥 Hot Fixes & Urgent Tasks'
    ];

    for (const title of boardTitles) {
      await expect(page.locator(`text=${title.slice(0, 20)}`)).toBeVisible();
    }

    // 13. Wait for real-time system to sync everything
    await page.waitForTimeout(8000);

    // 14. Verify all boards are still there after sync
    for (const title of boardTitles) {
      await expect(page.locator(`text=${title.slice(0, 20)}`)).toBeVisible();
    }

    // 15. Final notification check
    await page.click('button[title="Notifications"]');
    const notifications = page.locator('text=New board created');
    const notificationCount = await notifications.count();
    expect(notificationCount).toBeGreaterThanOrEqual(3);

    // Take final screenshot of complete user journey
    await page.screenshot({
      path: './screenshots/integration/03-user-journey-complete-1754162500000.png',
      fullPage: true
    });
  });

  test('data consistency across page reload and polling', async ({ page }) => {
    // Create initial data
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Consistency Test Board');
    await page.fill('textarea#board-goal', 'Testing data consistency across reloads and polling cycles');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // Edit the board
    await page.hover('div:has-text("Consistency Test Board")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', 'Consistency Test - Modified');
    await page.fill('textarea#edit-board-goal', 'Updated description to test consistency');
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(3000);

    // Store current state
    const beforeReload = await page.textContent('body');
    expect(beforeReload).toContain('Consistency Test - Modified');

    // Wait for multiple polling cycles
    await page.waitForTimeout(12000);

    // Reload page
    await page.reload();
    await page.waitForSelector('h1:has-text("Kanban Boards")');
    await page.waitForTimeout(2000);

    // Verify data consistency after reload
    await expect(page.locator('text=Consistency Test - Modified')).toBeVisible();
    await expect(page.locator('text=Updated description')).toBeVisible();

    // Wait for polling to resume and verify consistency
    await page.waitForTimeout(8000);
    await expect(page.locator('text=Consistency Test - Modified')).toBeVisible();

    // Test another edit after reload
    await page.hover('div:has-text("Consistency Test - Modified")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', 'Post-Reload Consistency Test');
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // Verify final consistency
    await expect(page.locator('text=Post-Reload Consistency Test')).toBeVisible();

    // Take screenshot showing data consistency
    await page.screenshot({
      path: './screenshots/integration/04-data-consistency-verified-1754162500000.png',
      fullPage: true
    });
  });

  test('performance under realistic load', async ({ page }) => {
    // Monitor performance metrics
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        renderTimes: [],
        apiResponseTimes: [],
        updateEvents: 0
      };

      // Monitor render performance
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            (window as any).performanceMetrics.renderTimes.push(entry.duration);
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });

      // Monitor update events
      window.addEventListener('boardsUpdated', () => {
        (window as any).performanceMetrics.updateEvents++;
      });
    });

    const startTime = Date.now();

    // Create realistic number of boards (15)
    for (let i = 1; i <= 15; i++) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', `Project Board ${i}`);
      await page.fill('textarea#board-goal', `Detailed project description for board ${i} including objectives, timeline, and key deliverables for comprehensive testing`);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(150);
    }

    // Perform realistic user interactions
    await page.waitForTimeout(3000);

    // Search operations
    const searchTerms = ['Project', 'Board', '1', '5', '10'];
    for (const term of searchTerms) {
      await page.fill('input[placeholder*="Search boards"]', term);
      await page.waitForTimeout(800);
      await page.click('button[title="Clear search"]');
      await page.waitForTimeout(200);
    }

    // Edit operations
    for (let i = 1; i <= 5; i++) {
      await page.hover(`div:has-text("Project Board ${i}")`);
      await page.click('button[title="Edit board"]');
      await page.fill('input#edit-board-name', `Updated Project ${i}`);
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(600);
    }

    // Theme switching
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(1000);
    await page.click('button[title*="Switch to light mode"]');

    // Notification checking
    await page.click('button[title="Notifications"]');
    await page.waitForTimeout(1000);
    await page.click('button[title="Notifications"]');

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Wait for polling and all operations to settle
    await page.waitForTimeout(10000);

    // Verify all boards are still functional
    await expect(page.locator('text=Updated Project 1')).toBeVisible();
    await expect(page.locator('text=Project Board 15')).toBeVisible();

    // Check performance metrics
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    console.log('Performance test results:', {
      totalTime,
      updateEvents: metrics.updateEvents,
      avgRenderTime: metrics.renderTimes.length > 0 ? 
        metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length : 0
    });

    // Performance assertions
    expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute
    expect(metrics.updateEvents).toBeGreaterThan(0);

    // Take screenshot of performance test result
    await page.screenshot({
      path: './screenshots/integration/05-performance-test-complete-1754162500000.png',
      fullPage: true
    });
  });
});