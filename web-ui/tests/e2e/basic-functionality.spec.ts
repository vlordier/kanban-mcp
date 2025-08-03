import { test, expect } from '@playwright/test';
import { setupMockApi, waitForPageLoad } from '../setup/test-helpers';

test.describe('Basic Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock API routes
    await setupMockApi(page);
    
    // Navigate to the app
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('loads the application successfully', async ({ page }) => {
    // Verify main elements are present
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    await expect(page.locator('button:has-text("New Board")')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({
      path: './screenshots/basic/01-app-loaded-1754162600000.png',
      fullPage: true
    });
  });

  test('can create a new board', async ({ page }) => {
    // Create a board with unique name
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'My New Board');
    await page.fill('textarea#board-goal', 'Testing board creation functionality');
    await page.click('button:has-text("Create Board")');
    
    // Verify board appears
    await expect(page.locator('text=My New Board')).toBeVisible();
    await expect(page.locator('text=Testing board creation functionality')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({
      path: './screenshots/basic/02-board-created-1754162600000.png',
      fullPage: true
    });
  });

  test('real-time updates indicator is present', async ({ page }) => {
    // Check for live updates indicator (use more specific selector)
    const liveUpdateSpan = page.locator('span:has-text("Live updates")').first();
    await expect(liveUpdateSpan).toBeVisible();
    
    // Check for pulse animation
    const pulseElement = page.locator('.animate-pulse').first();
    await expect(pulseElement).toBeVisible();
    
    // Take screenshot
    await page.screenshot({
      path: './screenshots/basic/03-live-updates-indicator-1754162600000.png'
    });
  });

  test('notifications button is functional', async ({ page }) => {
    // Check notification button
    await expect(page.locator('button[title="Notifications"]')).toBeVisible();
    
    // Click to open notifications
    await page.click('button[title="Notifications"]');
    
    // Should show notification panel header
    await expect(page.locator('h3:has-text("Notifications")')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({
      path: './screenshots/basic/04-notifications-panel-1754162600000.png'
    });
  });

  test('can edit a board', async ({ page }) => {
    // First create a board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Editable Board');
    await page.fill('textarea#board-goal', 'Original goal');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Hover and edit
    await page.hover('div:has-text("Editable Board")');
    await page.click('button[title="Edit board"]');
    
    // Update content
    await page.fill('input#edit-board-name', 'Updated Board');
    await page.fill('textarea#edit-board-goal', 'Updated goal');
    await page.click('button:has-text("Save Changes")');
    
    // Verify changes
    await expect(page.locator('text=Updated Board')).toBeVisible();
    await expect(page.locator('text=Updated goal')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({
      path: './screenshots/basic/05-board-edited-1754162600000.png',
      fullPage: true
    });
  });

  test('search functionality works', async ({ page }) => {
    // Create a couple of boards
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Search Test Board');
    await page.fill('textarea#board-goal', 'For testing search');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Another Board');
    await page.fill('textarea#board-goal', 'Different content');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Test search
    await page.fill('input[placeholder*="Search boards"]', 'Search Test');
    await page.waitForTimeout(1000);
    
    // Should show filtered results
    await expect(page.locator('text=Search Test Board')).toBeVisible();
    await expect(page.locator('text=Another Board')).not.toBeVisible();

    // Clear search
    await page.click('button[title="Clear search"]');
    await expect(page.locator('text=Another Board')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({
      path: './screenshots/basic/06-search-functionality-1754162600000.png',
      fullPage: true
    });
  });

  test('dark mode toggle works', async ({ page }) => {
    // Switch to dark mode
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);
    
    // Verify dark mode (check for dark class or dark styling)
    const bodyClass = await page.getAttribute('html', 'class');
    expect(bodyClass).toContain('dark');
    
    // Take screenshot in dark mode
    await page.screenshot({
      path: './screenshots/basic/07-dark-mode-1754162600000.png',
      fullPage: true
    });
    
    // Switch back to light mode
    await page.click('button[title*="Switch to light mode"]');
    await page.waitForTimeout(500);
    
    // Verify light mode
    const lightBodyClass = await page.getAttribute('html', 'class');
    expect(lightBodyClass).not.toContain('dark');
  });
});