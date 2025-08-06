import { test, expect } from '@playwright/test';

test.describe('Sleek Design Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('captures sleek homepage design with premium visual effects', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Take full page screenshot of sleek homepage
    await page.screenshot({
      path: './screenshots/sleek-design/01-premium-homepage-full-1754157877000.png',
      fullPage: true,
    });

    // Take focused screenshot of header with gradient typography
    await page
      .locator('h1:has-text("Kanban Boards")')
      .screenshot({ path: './screenshots/sleek-design/02-gradient-header-1754157877000.png' });

    // Screenshot the premium new board button with hover effect
    await page.locator('button:has-text("New Board")').hover();
    await page.waitForTimeout(500); // Wait for hover animation
    await page
      .locator('button:has-text("New Board")')
      .screenshot({ path: './screenshots/sleek-design/03-premium-button-hover-1754157877000.png' });

    // Screenshot the glass-morphism search bar
    await page
      .locator('input[placeholder*="Search boards"]')
      .screenshot({ path: './screenshots/sleek-design/04-glassmorphism-search-1754157877000.png' });
  });

  test('showcases premium table design with sophisticated styling', async ({ page }) => {
    // Create a test board to showcase table design
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Sleek Design Showcase');
    await page.fill(
      'textarea#board-goal',
      'Demonstrating premium visual design with sleek modern aesthetics, micro-interactions, and glass-morphism effects.'
    );
    await page.click('button:has-text("Create Board")');

    // Wait for board to appear
    await page.waitForSelector('td:has-text("Sleek Design Showcase")');

    // Screenshot the enhanced table with gradient headers
    await page.locator('table').screenshot({
      path: './screenshots/sleek-design/05-premium-table-design-1754157877000.png',
    });

    // Screenshot table header with gradient typography
    await page.locator('thead').screenshot({
      path: './screenshots/sleek-design/06-gradient-table-headers-1754157877000.png',
    });

    // Hover over a table row to show sophisticated hover effects
    await page.locator('tr:has-text("Sleek Design Showcase")').hover();
    await page.waitForTimeout(500);
    await page
      .locator('tr:has-text("Sleek Design Showcase")')
      .screenshot({ path: './screenshots/sleek-design/07-row-hover-effects-1754157877000.png' });

    // Screenshot premium action buttons
    await page.locator('tr:has-text("Sleek Design Showcase") .flex').screenshot({
      path: './screenshots/sleek-design/08-premium-action-buttons-1754157877000.png',
    });
  });

  test('demonstrates premium dialog designs with backdrop blur', async ({ page }) => {
    // Create a board first
    await page.click('button:has-text("New Board")');

    // Screenshot the premium create dialog
    await page.screenshot({
      path: './screenshots/sleek-design/09-premium-create-dialog-1754157877000.png',
    });

    // Focus on the dialog content
    await page.locator('[role="dialog"]').screenshot({
      path: './screenshots/sleek-design/10-glassmorphism-dialog-1754157877000.png',
    });

    // Cancel to close dialog
    await page.click('button:has-text("Cancel")');

    // Create a board to test delete dialog
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Test Delete Dialog');
    await page.fill('textarea#board-goal', 'Testing premium delete dialog design');
    await page.click('button:has-text("Create Board")');

    // Wait and click delete
    await page.waitForSelector('td:has-text("Test Delete Dialog")');
    await page.click('tr:has-text("Test Delete Dialog") button:has-text("Delete")');

    // Screenshot the premium delete confirmation dialog
    await page.screenshot({
      path: './screenshots/sleek-design/11-premium-delete-dialog-1754157877000.png',
    });

    // Focus on delete dialog content
    await page.locator('[role="dialog"]').screenshot({
      path: './screenshots/sleek-design/12-delete-dialog-content-1754157877000.png',
    });
  });

  test('captures mobile responsive sleek design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X

    // Wait for load
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Take mobile homepage screenshot
    await page.screenshot({
      path: './screenshots/sleek-design/13-mobile-premium-homepage-1754157877000.png',
      fullPage: true,
    });

    // Test mobile dialog
    await page.click('button:has-text("New Board")');
    await page.screenshot({
      path: './screenshots/sleek-design/14-mobile-premium-dialog-1754157877000.png',
    });
  });

  test('showcases empty state with premium design', async ({ page }) => {
    // Clear any existing boards first
    const deleteButtons = await page.locator('button:has-text("Delete")').all();
    for (const button of deleteButtons) {
      await button.click();
      await page.click('button:has-text("Delete"):not(:has-text("Cancel"))');
      await page.waitForTimeout(500);
    }

    // Screenshot premium empty state
    await page.screenshot({
      path: './screenshots/sleek-design/15-premium-empty-state-1754157877000.png',
      fullPage: true,
    });

    // Focus on the welcome section with premium styling
    await page.locator('td').first().screenshot({
      path: './screenshots/sleek-design/16-welcome-premium-design-1754157877000.png',
    });
  });

  test('demonstrates search functionality with sleek design', async ({ page }) => {
    // Create multiple boards for search demo
    const boards = [
      { name: 'Project Alpha', goal: 'Revolutionary user interface design' },
      { name: 'Design System', goal: 'Comprehensive component library' },
      { name: 'Marketing Campaign', goal: 'Brand awareness initiative' },
    ];

    for (const board of boards) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', board.name);
      await page.fill('textarea#board-goal', board.goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(500);
    }

    // Focus on search bar and search
    await page.click('input[placeholder*="Search boards"]');
    await page.fill('input[placeholder*="Search boards"]', 'Design');

    // Screenshot search results with sleek design
    await page.screenshot({
      path: './screenshots/sleek-design/17-search-results-premium-1754157877000.png',
      fullPage: true,
    });

    // Clear search to show clear button design
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: './screenshots/sleek-design/18-post-search-clear-1754157877000.png',
      fullPage: true,
    });
  });
});
