import { test, expect } from '@playwright/test';

test.describe('Basic Screenshots and Visual Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Capture homepage and basic navigation screenshots', async ({ page }) => {
    const timestamp = Date.now();
    
    // 1. Homepage empty state
    await page.screenshot({ 
      path: `screenshots/basic/01-homepage-initial-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 2. Open create board dialog
    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({ 
      path: `screenshots/basic/02-create-board-dialog-${timestamp}.png` 
    });
    
    // 3. Fill in form
    await page.locator('input#board-name').fill('Screenshot Demo Board');
    await page.locator('textarea#board-goal').fill('This board demonstrates the screenshot capabilities of our E2E testing framework');
    await page.screenshot({ 
      path: `screenshots/basic/03-create-board-filled-${timestamp}.png` 
    });
    
    // 4. Create board
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/basic/04-board-created-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 5. Navigate to board detail
    await page.locator('tr:has-text("Screenshot Demo Board") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/basic/05-empty-board-detail-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 6. Test search functionality
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(500);
    
    await page.locator('input[placeholder*="Search boards"]').fill('Screenshot');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `screenshots/basic/06-search-functionality-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 7. Clear search
    await page.locator('button:has-text("Clear")').click();
    await page.screenshot({ 
      path: `screenshots/basic/07-search-cleared-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Verify board was created successfully
    await expect(page.locator('td:has-text("Screenshot Demo Board")')).toBeVisible();
  });

  test('Capture responsive screenshots at different viewports', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create a demo board first
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Responsive Demo');
    await page.locator('textarea#board-goal').fill('Testing responsive design');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'laptop', width: 1280, height: 720 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Homepage
      await page.screenshot({ 
        path: `screenshots/responsive/homepage-${viewport.name}-${viewport.width}x${viewport.height}-${timestamp}.png`, 
        fullPage: true 
      });
      
      // Board detail
      await page.locator('tr:has-text("Responsive Demo") a:has-text("View")').first().click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/responsive/board-detail-${viewport.name}-${viewport.width}x${viewport.height}-${timestamp}.png`, 
        fullPage: true 
      });
      
      // Back to homepage
      await page.locator('a:has-text("MCP Kanban")').click();
      await page.waitForTimeout(500);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Capture different UI states and interactions', async ({ page }) => {
    const timestamp = Date.now();
    
    // 1. Focus states
    await page.locator('input[placeholder*="Search boards"]').focus();
    await page.screenshot({ 
      path: `screenshots/ui-states/01-search-focus-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 2. Button hover state (simulate by focusing)
    await page.locator('button:has-text("New Board")').focus();
    await page.screenshot({ 
      path: `screenshots/ui-states/02-button-focus-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 3. Form validation states
    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({ 
      path: `screenshots/ui-states/03-empty-form-${timestamp}.png` 
    });
    
    // Partial form (button should be disabled)
    await page.locator('input#board-name').fill('Validation Test');
    await page.screenshot({ 
      path: `screenshots/ui-states/04-partial-form-${timestamp}.png` 
    });
    
    // Complete form (button should be enabled)
    await page.locator('textarea#board-goal').fill('Testing form validation states');
    await page.screenshot({ 
      path: `screenshots/ui-states/05-complete-form-${timestamp}.png` 
    });
    
    // 4. Modal close
    await page.keyboard.press('Escape');
    await page.screenshot({ 
      path: `screenshots/ui-states/06-modal-closed-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 5. Keyboard shortcuts indicator
    await page.keyboard.press('Meta+k');
    await page.screenshot({ 
      path: `screenshots/ui-states/07-search-keyboard-focus-${timestamp}.png`, 
      fullPage: true 
    });
    
    await page.keyboard.press('Escape');
  });

  test('Capture error states and edge cases', async ({ page }) => {
    const timestamp = Date.now();
    
    // 1. Invalid route
    await page.goto('/boards/nonexistent-board-id');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/error-states/01-invalid-board-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 2. Back to valid page
    await page.locator('a:has-text("Go back to boards list")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/error-states/02-back-to-boards-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 3. Search with no results
    await page.locator('input[placeholder*="Search boards"]').fill('NonexistentBoard12345');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `screenshots/error-states/03-no-search-results-${timestamp}.png`, 
      fullPage: true 
    });
    
    // 4. Long content handling
    await page.locator('button:has-text("Clear")').click();
    await page.locator('button:has-text("New Board")').click();
    
    const longName = 'Very Long Board Name That Tests How The UI Handles Extended Text Content';
    const longGoal = 'This is a very long project goal description that tests how the user interface handles extended text content. It should wrap properly and not break the layout. The description continues with more details about the project objectives, scope, timeline, and expected deliverables. This helps us verify that our UI components can handle real-world content that might be longer than expected.';
    
    await page.locator('input#board-name').fill(longName);
    await page.locator('textarea#board-goal').fill(longGoal);
    await page.screenshot({ 
      path: `screenshots/error-states/04-long-content-form-${timestamp}.png` 
    });
    
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/error-states/05-long-content-in-list-${timestamp}.png`, 
      fullPage: true 
    });
  });

  test('Performance test with multiple boards', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create multiple boards quickly
    const boardCount = 8;
    const boardNames = [
      'Frontend Development',
      'Backend API Services', 
      'Mobile Application',
      'DevOps & Infrastructure',
      'Quality Assurance',
      'User Experience Design',
      'Product Management',
      'Data Analytics'
    ];
    
    for (let i = 0; i < boardCount; i++) {
      await page.locator('button:has-text("New Board")').click();
      await page.locator('input#board-name').fill(boardNames[i]);
      await page.locator('textarea#board-goal').fill(`Project goals and objectives for ${boardNames[i]} team`);
      await page.locator('button:has-text("Create Board")').click();
      await page.waitForTimeout(500);
      
      // Take screenshot every few boards
      if ((i + 1) % 3 === 0) {
        await page.screenshot({ 
          path: `screenshots/performance/multiple-boards-${i + 1}-created-${timestamp}.png`, 
          fullPage: true 
        });
      }
    }
    
    // Final screenshot with all boards
    await page.screenshot({ 
      path: `screenshots/performance/all-boards-created-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Test filtering performance
    await page.locator('input[placeholder*="Search boards"]').fill('Dev');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `screenshots/performance/filtered-boards-${timestamp}.png`, 
      fullPage: true 
    });
    
    await page.locator('button:has-text("Clear")').click();
  });
});