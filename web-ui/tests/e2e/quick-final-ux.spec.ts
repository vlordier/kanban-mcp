import { test, expect } from '@playwright/test';

test.describe('Quick Final UX Capture', () => {
  test('captures final UX state', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    // Take full page screenshot
    await page.screenshot({
      path: './screenshots/final-ux/FINAL-polished-ux-homepage-1754159300000.png',
      fullPage: true,
    });

    // Screenshot search area
    await page.locator('.mt-10').first().screenshot({
      path: './screenshots/final-ux/FINAL-search-and-counter-1754159300000.png',
    });

    // Screenshot board cards section
    await page.locator('[class*="shadow-xl shadow-gray-100"]').screenshot({
      path: './screenshots/final-ux/FINAL-card-layout-section-1754159300000.png',
    });
  });
});
