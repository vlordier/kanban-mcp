import { test, expect } from '@playwright/test';

test.describe('Expert UX Showcase - Best in Class Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('showcases expert-level light mode experience', async ({ page }) => {
    // Wait for load and ensure light mode
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Take full homepage screenshot in light mode
    await page.screenshot({
      path: './screenshots/expert-ux/01-light-mode-homepage-1754160000000.png',
      fullPage: true,
    });

    // Create realistic boards with proper emojis
    const expertBoards = [
      {
        name: 'UX Research & Design System',
        goal: 'Conduct comprehensive user research and build a scalable design system to improve product consistency and user experience across all touchpoints.',
      },
      {
        name: 'Mobile App Development Sprint',
        goal: 'Develop and ship the new mobile application with native performance, offline capabilities, and seamless cross-platform synchronization.',
      },
      {
        name: 'Product Analytics Dashboard',
        goal: 'Build advanced analytics dashboard with real-time insights, predictive modeling, and actionable business intelligence for data-driven decisions.',
      },
    ];

    for (const board of expertBoards) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', board.name);
      await page.fill('textarea#board-goal', board.goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(800);
    }

    // Screenshot the expert card layout with emojis and activity indicators
    await page.screenshot({
      path: './screenshots/expert-ux/02-expert-card-layout-light-1754160000000.png',
      fullPage: true,
    });

    // Focus on individual card to show expert design details
    await page.locator('div:has-text("UX Research & Design System")').first().screenshot({
      path: './screenshots/expert-ux/03-expert-board-card-details-1754160000000.png',
    });
  });

  test('demonstrates dark mode excellence', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Toggle to dark mode
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500); // Wait for dark mode transition

    // Screenshot dark mode homepage
    await page.screenshot({
      path: './screenshots/expert-ux/04-dark-mode-homepage-1754160000000.png',
      fullPage: true,
    });

    // Create a board to show dark mode dialogs
    await page.click('button:has-text("New Board")');

    // Screenshot dark mode create dialog
    await page.screenshot({
      path: './screenshots/expert-ux/05-dark-mode-create-dialog-1754160000000.png',
    });

    await page.fill('input#board-name', 'Dark Mode Excellence');
    await page.fill(
      'textarea#board-goal',
      'Demonstrating world-class dark mode design with proper color theory, contrast ratios, and visual hierarchy.'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Screenshot dark mode with content
    await page.screenshot({
      path: './screenshots/expert-ux/06-dark-mode-with-content-1754160000000.png',
      fullPage: true,
    });

    // Show dark mode delete dialog
    await page.click('button[title="Delete board"]');
    await page.screenshot({
      path: './screenshots/expert-ux/07-dark-mode-delete-dialog-1754160000000.png',
    });
  });

  test('showcases search and empty state excellence', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Test search functionality
    await page.fill('input[placeholder*="Search boards"]', 'nonexistent');
    await page.waitForTimeout(300);

    // Screenshot expert empty search state with emoji
    await page.screenshot({
      path: './screenshots/expert-ux/08-expert-search-empty-state-1754160000000.png',
      fullPage: true,
    });

    // Clear search to show main empty state
    await page.click('button[title="Clear search"]');
    await page.waitForTimeout(300);

    // Screenshot expert main empty state
    await page.screenshot({
      path: './screenshots/expert-ux/09-expert-main-empty-state-1754160000000.png',
      fullPage: true,
    });
  });

  test('mobile responsive expert design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Screenshot mobile light mode
    await page.screenshot({
      path: './screenshots/expert-ux/10-mobile-light-expert-1754160000000.png',
      fullPage: true,
    });

    // Toggle to dark mode on mobile
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);

    // Screenshot mobile dark mode
    await page.screenshot({
      path: './screenshots/expert-ux/11-mobile-dark-expert-1754160000000.png',
      fullPage: true,
    });

    // Test mobile create dialog
    await page.click('button:has-text("New Board")');
    await page.screenshot({
      path: './screenshots/expert-ux/12-mobile-create-dialog-1754160000000.png',
    });
  });

  test('demonstrates expert micro-interactions', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create a board for interaction testing
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Micro-Interactions Demo');
    await page.fill(
      'textarea#board-goal',
      'Testing expert-level micro-interactions and hover states.'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Hover over board card to show expert hover effects
    await page.hover('div:has-text("Micro-Interactions Demo")');
    await page.waitForTimeout(500);

    // Screenshot hover state with animations
    await page.locator('div:has-text("Micro-Interactions Demo")').first().screenshot({
      path: './screenshots/expert-ux/13-expert-hover-effects-1754160000000.png',
    });

    // Test button hover states
    await page.hover('button:has-text("Open Board")');
    await page.waitForTimeout(300);

    // Screenshot button hover state
    await page.locator('div:has-text("Micro-Interactions Demo")').first().screenshot({
      path: './screenshots/expert-ux/14-button-hover-states-1754160000000.png',
    });
  });
});
