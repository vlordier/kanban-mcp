import { test, expect } from '@playwright/test';

test.describe('Production-Ready Features Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('demonstrates enhanced layout and visual hierarchy', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Screenshot new enhanced header layout
    await page.screenshot({
      path: './screenshots/production-ready/01-enhanced-header-layout-1754161000000.png',
      fullPage: true,
    });

    // Create board to show enhanced card layout
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Production Analytics Dashboard');
    await page.fill(
      'textarea#board-goal',
      'Advanced analytics platform with real-time insights, machine learning predictions, and comprehensive business intelligence for data-driven strategic decisions.'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(800);

    // Screenshot enhanced card with stats and better visual hierarchy
    await page.screenshot({
      path: './screenshots/production-ready/02-enhanced-card-layout-1754161000000.png',
      fullPage: true,
    });
  });

  test('showcases real-time updates and notifications', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Screenshot the live updates indicator
    await page.locator('span:has-text("Live updates")').screenshot({
      path: './screenshots/production-ready/03-live-updates-indicator-1754161000000.png',
    });

    // Click notifications to show system
    await page.click('button[title="Notifications"]');

    // Screenshot notification system
    await page.screenshot({
      path: './screenshots/production-ready/04-notification-system-1754161000000.png',
    });
  });

  test('demonstrates board editing capabilities', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create a board first
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Customer Feedback System');
    await page.fill(
      'textarea#board-goal',
      'Comprehensive system for collecting, analyzing, and acting on customer feedback to drive product improvements.'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Hover over card to show edit button
    await page.hover('div:has-text("Customer Feedback System")');
    await page.waitForTimeout(500);

    // Screenshot edit button on hover
    await page.locator('div:has-text("Customer Feedback System")').first().screenshot({
      path: './screenshots/production-ready/05-edit-button-hover-1754161000000.png',
    });

    // Click edit button
    await page.click('button[title="Edit board"]');

    // Screenshot edit dialog
    await page.screenshot({
      path: './screenshots/production-ready/06-edit-board-dialog-1754161000000.png',
    });

    // Make changes and save
    await page.fill('input#edit-board-name', 'Advanced Customer Feedback Platform');
    await page.fill(
      'textarea#edit-board-goal',
      'Next-generation feedback platform with AI-powered sentiment analysis, automated categorization, and predictive insights for proactive customer experience management.'
    );

    // Screenshot with changes
    await page.screenshot({
      path: './screenshots/production-ready/07-edit-dialog-with-changes-1754161000000.png',
    });

    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(500);

    // Screenshot updated board
    await page.screenshot({
      path: './screenshots/production-ready/08-updated-board-result-1754161000000.png',
      fullPage: true,
    });
  });

  test('showcases task statistics and board analytics', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create boards to show statistics
    const boards = [
      {
        name: 'API Development Sprint',
        goal: 'Build robust RESTful API with authentication, rate limiting, and comprehensive documentation',
      },
      {
        name: 'UI/UX Design System',
        goal: 'Create cohesive design system with reusable components, accessibility guidelines, and design tokens',
      },
    ];

    for (const board of boards) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', board.name);
      await page.fill('textarea#board-goal', board.goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(600);
    }

    // Screenshot boards with task statistics
    await page.screenshot({
      path: './screenshots/production-ready/09-boards-with-statistics-1754161000000.png',
      fullPage: true,
    });

    // Focus on individual card to show detailed stats
    await page.locator('div:has-text("API Development Sprint")').first().screenshot({
      path: './screenshots/production-ready/10-detailed-board-statistics-1754161000000.png',
    });
  });

  test('demonstrates dark mode with all features', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create some content first
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Dark Mode Excellence');
    await page.fill(
      'textarea#board-goal',
      'Demonstrating world-class dark mode implementation with proper contrast ratios and visual hierarchy'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Toggle to dark mode
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(600);

    // Screenshot dark mode with enhanced layout
    await page.screenshot({
      path: './screenshots/production-ready/11-dark-mode-enhanced-layout-1754161000000.png',
      fullPage: true,
    });

    // Show notifications in dark mode
    await page.click('button[title="Notifications"]');
    await page.screenshot({
      path: './screenshots/production-ready/12-dark-mode-notifications-1754161000000.png',
    });

    // Close notifications and show edit dialog in dark mode
    await page.click('button[title="Notifications"]'); // Close notifications
    await page.hover('div:has-text("Dark Mode Excellence")');
    await page.click('button[title="Edit board"]');

    // Screenshot dark mode edit dialog
    await page.screenshot({
      path: './screenshots/production-ready/13-dark-mode-edit-dialog-1754161000000.png',
    });
  });

  test('mobile responsive production features', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create content for mobile test
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Mobile Optimization Project');
    await page.fill(
      'textarea#board-goal',
      'Optimize mobile experience with touch-friendly interfaces and responsive design patterns'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Screenshot mobile layout with enhanced features
    await page.screenshot({
      path: './screenshots/production-ready/14-mobile-enhanced-layout-1754161000000.png',
      fullPage: true,
    });

    // Test mobile notifications
    await page.click('button[title="Notifications"]');
    await page.screenshot({
      path: './screenshots/production-ready/15-mobile-notifications-1754161000000.png',
    });
  });

  test('showcases comprehensive empty states', async ({ page }) => {
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Test search empty state
    await page.fill('input[placeholder*="Search boards"]', 'nonexistent project');
    await page.waitForTimeout(300);

    // Screenshot enhanced search empty state
    await page.screenshot({
      path: './screenshots/production-ready/16-enhanced-search-empty-state-1754161000000.png',
      fullPage: true,
    });

    // Clear search and test main empty state if no boards
    await page.click('button[title="Clear search"]');
    await page.waitForTimeout(300);

    // Screenshot main empty state with enhanced design
    await page.screenshot({
      path: './screenshots/production-ready/17-enhanced-main-empty-state-1754161000000.png',
      fullPage: true,
    });
  });
});
