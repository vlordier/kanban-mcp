import { test, expect } from '@playwright/test';

test.describe('Sleek Design Final Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('captures sleek homepage design - final version', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('h1:has-text("Kanban Boards")');
    
    // Take full page screenshot of sleek homepage
    await page.screenshot({
      path: './screenshots/sleek-design/final-homepage-sleek-1754157900000.png',
      fullPage: true,
    });

    // Screenshot the premium header with gradient typography
    await page.locator('h1:has-text("Kanban Boards")').screenshot({
      path: './screenshots/sleek-design/final-gradient-header-1754157900000.png'
    });
  });

  test('showcases premium table and dialogs', async ({ page }) => {
    // Create a test board
    await page.click('button:has-text("New Board")');
    
    // Screenshot the premium create dialog
    await page.screenshot({
      path: './screenshots/sleek-design/final-create-dialog-1754157900000.png'
    });

    await page.fill('input#board-name', 'Premium Design Showcase');
    await page.fill('textarea#board-goal', 'Demonstrating sleek, modern design with premium visual effects and sophisticated micro-interactions.');
    await page.click('button:has-text("Create Board")');
    
    // Wait for board to appear and screenshot table
    await page.waitForSelector('td:has-text("Premium Design Showcase")');
    await page.locator('table').screenshot({
      path: './screenshots/sleek-design/final-premium-table-1754157900000.png'
    });

    // Show delete dialog
    await page.click('tr:has-text("Premium Design Showcase") button:has-text("Delete")');
    await page.screenshot({
      path: './screenshots/sleek-design/final-delete-dialog-1754157900000.png'
    });
  });

  test('mobile responsive sleek design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('h1:has-text("Kanban Boards")');

    await page.screenshot({
      path: './screenshots/sleek-design/final-mobile-homepage-1754157900000.png',
      fullPage: true,
    });
  });
});