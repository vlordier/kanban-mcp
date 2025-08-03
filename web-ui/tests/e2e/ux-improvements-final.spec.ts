import { test, expect } from '@playwright/test';

test.describe('UX Improvements Final Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('captures improved card-based layout', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Take full page screenshot of improved UX
    await page.screenshot({
      path: './screenshots/ux-improvements/01-card-layout-homepage-1754158800000.png',
      fullPage: true,
    });

    // Screenshot the improved search section
    await page.locator('input[placeholder*="Search boards"]').screenshot({
      path: './screenshots/ux-improvements/02-improved-search-ux-1754158800000.png',
    });
  });

  test('showcases better information hierarchy', async ({ page }) => {
    // Create a few boards to show the improved layout
    const boards = [
      {
        name: 'User Research Project',
        goal: 'Conduct comprehensive user interviews and usability testing to improve our product experience and identify key pain points in the current user journey.',
      },
      {
        name: 'Mobile App Development',
        goal: 'Build a responsive mobile application with modern UX patterns and seamless performance across iOS and Android platforms.',
      },
      {
        name: 'Marketing Campaign Q1',
        goal: 'Launch integrated marketing campaign across social media, email, and content marketing to increase brand awareness by 40%.',
      },
    ];

    for (const board of boards) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', board.name);
      await page.fill('textarea#board-goal', board.goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(500);
    }

    // Screenshot the improved card layout
    await page.screenshot({
      path: './screenshots/ux-improvements/03-card-layout-with-content-1754158800000.png',
      fullPage: true,
    });

    // Focus on individual board card to show improved hierarchy
    await page.locator('div:has-text("User Research Project")').first().screenshot({
      path: './screenshots/ux-improvements/04-improved-board-card-1754158800000.png',
    });

    // Test search functionality UX
    await page.fill('input[placeholder*="Search boards"]', 'Mobile');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: './screenshots/ux-improvements/05-search-results-ux-1754158800000.png',
      fullPage: true,
    });

    // Show improved action buttons
    await page.hover('div:has-text("Mobile App Development")');
    await page.waitForTimeout(300);
    await page.locator('div:has-text("Mobile App Development")').first().screenshot({
      path: './screenshots/ux-improvements/06-action-buttons-ux-1754158800000.png',
    });
  });

  test('demonstrates improved empty state', async ({ page }) => {
    // Clear any existing boards
    const deleteButtons = await page.locator('button[title="Delete board"]').all();
    for (let i = 0; i < Math.min(deleteButtons.length, 5); i++) {
      await deleteButtons[i].click();
      await page.click('button:has-text("Delete"):not(:has-text("Cancel"))');
      await page.waitForTimeout(500);
    }

    // Screenshot improved empty state
    await page.screenshot({
      path: './screenshots/ux-improvements/07-improved-empty-state-1754158800000.png',
      fullPage: true,
    });
  });

  test('mobile UX improvements', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create one board for mobile testing
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Mobile UX Test');
    await page.fill('textarea#board-goal', 'Testing mobile user experience improvements');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Screenshot mobile improvements
    await page.screenshot({
      path: './screenshots/ux-improvements/08-mobile-card-layout-1754158800000.png',
      fullPage: true,
    });
  });
});
