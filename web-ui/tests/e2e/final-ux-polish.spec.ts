import { test, expect } from '@playwright/test';

test.describe('Final UX Polish Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('captures final polished UX design', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Take full page screenshot of final polished UX
    await page.screenshot({
      path: './screenshots/final-ux/01-polished-homepage-1754159200000.png',
      fullPage: true,
    });

    // Create a few realistic boards to show the improved UX
    const boards = [
      {
        name: 'Product Roadmap 2024',
        goal: 'Plan and execute key product features for the upcoming year, focusing on user experience improvements and market expansion.',
      },
      {
        name: 'Website Redesign',
        goal: 'Modernize company website with improved UX, better conversion rates, and mobile-first responsive design.',
      },
      {
        name: 'Customer Onboarding',
        goal: 'Streamline the customer onboarding process to reduce time-to-value and improve user retention rates.',
      },
    ];

    for (const board of boards) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', board.name);
      await page.fill('textarea#board-goal', board.goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(700);
    }

    // Screenshot the polished card layout with realistic content
    await page.screenshot({
      path: './screenshots/final-ux/02-polished-board-cards-1754159200000.png',
      fullPage: true,
    });

    // Test search UX
    await page.fill('input[placeholder*="Search boards"]', 'Product');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: './screenshots/final-ux/03-polished-search-experience-1754159200000.png',
      fullPage: true,
    });

    // Clear search to show all boards with pagination
    await page.click('button[title="Clear search"]', { timeout: 1000 }).catch(() => {
      // If clear button not found, clear by selecting all and deleting
      page.locator('input[placeholder*="Search boards"]').selectText();
      page.keyboard.press('Delete');
    });
    await page.waitForTimeout(300);

    // Focus on individual board card to show status badges and improved hierarchy
    await page.locator('div:has-text("Website Redesign")').first().screenshot({
      path: './screenshots/final-ux/04-polished-board-card-detail-1754159200000.png',
    });

    // Show hover state on action buttons
    await page.hover('div:has-text("Customer Onboarding") >> text=Open Board');
    await page.waitForTimeout(300);
    await page.locator('div:has-text("Customer Onboarding")').first().screenshot({
      path: './screenshots/final-ux/05-polished-action-buttons-1754159200000.png',
    });
  });

  test('mobile UX polish', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Create one board for mobile testing
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Mobile Project Dashboard');
    await page.fill(
      'textarea#board-goal',
      'Optimize mobile experience with touch-friendly interface and responsive design patterns.'
    );
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(500);

    // Screenshot polished mobile experience
    await page.screenshot({
      path: './screenshots/final-ux/06-polished-mobile-experience-1754159200000.png',
      fullPage: true,
    });
  });

  test('demonstrates information density control', async ({ page }) => {
    // Wait for boards to load
    await page.waitForSelector('h1:has-text("Kanban Boards")');
    await page.waitForTimeout(1000);

    // Check if there are many boards and pagination footer appears
    const boardCount = await page.locator('div:has-text("total boards")').textContent();

    // If there are more than 15 boards, capture the pagination UX
    if (boardCount && parseInt(boardCount) > 15) {
      await page.screenshot({
        path: './screenshots/final-ux/07-information-density-control-1754159200000.png',
        fullPage: true,
      });
    }

    // Screenshot the clean board counter in search area
    await page.locator('div:has-text("total board")').screenshot({
      path: './screenshots/final-ux/08-board-counter-ux-1754159200000.png',
    });
  });
});
