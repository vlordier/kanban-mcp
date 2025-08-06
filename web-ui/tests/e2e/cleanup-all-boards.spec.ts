import { test } from '@playwright/test';

test.describe('Cleanup All Test Data', () => {
  test('removes all test boards to clean slate', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Get all delete buttons and click them systematically
    let deleteButtons = await page.locator('button[title="Delete board"]').all();

    // Delete in batches to avoid overwhelming the system
    for (let i = 0; i < deleteButtons.length && i < 50; i++) {
      try {
        // Click delete button
        await deleteButtons[i].click({ timeout: 2000 });

        // Wait for dialog and confirm deletion
        await page.waitForSelector('button:has-text("Delete"):not(:has-text("Cancel"))', {
          timeout: 3000,
        });
        await page.click('button:has-text("Delete"):not(:has-text("Cancel"))');

        // Wait for deletion to complete
        await page.waitForTimeout(500);

        // Refresh the list of delete buttons
        deleteButtons = await page.locator('button[title="Delete board"]').all();
      } catch (error) {
        console.log(`Cleanup iteration ${i} failed, continuing...`);
        continue;
      }
    }

    console.log('Cleanup completed');
  });
});
