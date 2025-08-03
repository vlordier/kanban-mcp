import { test, expect } from '@playwright/test';

test.describe('Test Data Cleanup', () => {
  test('Clean up test boards for better UX screenshots', async ({ page }) => {
    await page.goto('/');

    // Delete boards with test patterns to clean up the UI
    const testPatterns = [
      'Test Board',
      'Task Test Board',
      'Stress Test',
      'Network Test',
      'Mobile Test',
      'Frontend Development',
      'Backend API',
      'DevOps Pipeline',
      'Concurrent Test',
      'Large Content Test',
      'Responsive Demo',
      'Accessibility Test',
      'Screenshot Demo',
    ];

    let cleanupCount = 0;
    const maxCleanup = 30; // Prevent infinite loops

    while (cleanupCount < maxCleanup) {
      let foundTestBoard = false;

      for (const pattern of testPatterns) {
        const deleteButtons = page.locator(`tr:has-text("${pattern}") button:has-text("Delete")`);
        const count = await deleteButtons.count();

        if (count > 0) {
          try {
            await deleteButtons.first().click();
            await page.locator('div[role="dialog"] button:has-text("Delete")').click();
            await page.waitForTimeout(1000);
            foundTestBoard = true;
            cleanupCount++;
            console.log(`Deleted test board matching: ${pattern}`);
            break;
          } catch (error) {
            console.log(`Failed to delete board matching ${pattern}:`, error);
          }
        }
      }

      // Also clean up boards with timestamps
      if (!foundTestBoard) {
        const timestampBoards = page.locator('tr:has-text(/\\d{13}/) button:has-text("Delete")');
        const timestampCount = await timestampBoards.count();

        if (timestampCount > 0) {
          try {
            await timestampBoards.first().click();
            await page.locator('div[role="dialog"] button:has-text("Delete")').click();
            await page.waitForTimeout(1000);
            foundTestBoard = true;
            cleanupCount++;
            console.log('Deleted timestamp-based test board');
          } catch (error) {
            console.log('Failed to delete timestamp board:', error);
          }
        }
      }

      if (!foundTestBoard) {
        break; // No more test boards found
      }
    }

    console.log(`Cleanup completed. Removed ${cleanupCount} test boards.`);

    await page.screenshot({
      path: `screenshots/cleanup/cleaned-homepage-${Date.now()}.png`,
      fullPage: true,
    });
  });
});
