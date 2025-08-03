import { test, expect } from '@playwright/test';

test.describe('Accessibility and Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper heading hierarchy and ARIA labels', async ({ page }) => {
    // Check main heading
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toHaveText('MCP Kanban');

    // Check boards list heading
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();

    // Check button accessibility
    const newBoardButton = page.locator('button:has-text("New Board")');
    await expect(newBoardButton).toBeVisible();

    // Check search input has proper labeling
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder');
  });

  test('should be keyboard navigable - boards list', async ({ page }) => {
    // Tab navigation through main elements
    await page.keyboard.press('Tab'); // Should focus search input
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await expect(searchInput).toBeFocused();

    await page.keyboard.press('Tab'); // Should focus clear button or New Board button
    await page.keyboard.press('Tab'); // Should focus New Board button
    const newBoardButton = page.locator('button:has-text("New Board")');

    // Test keyboard activation
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Create New Board')).toBeVisible();

    // Test ESC to close
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Create New Board')).not.toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // Check responsive behavior
    await expect(page.locator('h1:has-text("MCP Kanban")')).toBeVisible();
    await expect(page.locator('button:has-text("New Board")')).toBeVisible();

    // Check search input is still accessible
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await expect(searchInput).toBeVisible();

    // Test mobile interaction - create board
    await page.locator('button:has-text("New Board")').click();
    await expect(page.locator('text=Create New Board')).toBeVisible();

    // Check dialog is properly sized on mobile
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('should work in board detail view on mobile', async ({ page }) => {
    // Create a board first
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Mobile Test Board');
    await page.locator('textarea#board-goal').fill('Testing mobile responsiveness');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    // Navigate to board
    await page.locator('tr:has-text("Mobile Test Board") a:has-text("View")').click();

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Check columns are visible and scrollable
    await expect(page.locator('text=To Do')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();

    // Test horizontal scroll for columns
    const columnsContainer = page.locator('div.flex.gap-4.min-w-max');
    await expect(columnsContainer).toBeVisible();

    // Test create task on mobile
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    const plusButton = todoColumn.locator('button[title="Add new task"]');
    await plusButton.click();

    // Check task creation dialog works on mobile
    await expect(page.locator('text=Create New Task')).toBeVisible();
    const taskDialog = page.locator('[role="dialog"]:has-text("Create New Task")');
    await expect(taskDialog).toBeVisible();
  });

  test('should handle high contrast and color accessibility', async ({ page }) => {
    // Create a board with tasks to test color contrast
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Contrast Test Board');
    await page.locator('textarea#board-goal').fill('Testing color contrast');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    await page.locator('tr:has-text("Contrast Test Board") a:has-text("View")').click();
    await page.waitForTimeout(500);

    // Create tasks in different columns to test color coding
    const columns = ['To Do', 'In Progress', 'Done'];

    for (const columnName of columns) {
      const column = page.locator(`div:has(h3:has-text("${columnName}"))`);
      await column.locator('button[title="Add new task"]').click();

      await page.locator('input#task-title').fill(`${columnName} Task`);
      await page.locator('textarea#task-content').fill(`Task in ${columnName} column`);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(500);
    }

    // Check that different column types have different visual indicators
    // To Do (blue/gray)
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await expect(todoColumn).toHaveClass(/bg-.*-100/); // Should have colored background

    // In Progress (yellow)
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');
    await expect(inProgressColumn).toHaveClass(/bg-.*-100/);

    // Done (green)
    const doneColumn = page.locator('div:has(h3:has-text("Done"))');
    await expect(doneColumn).toHaveClass(/bg-.*-100/);
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for proper ARIA roles and labels
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();

    // Check table has proper structure for screen readers
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check table headers
    const headers = page.locator('th');
    await expect(headers.nth(0)).toHaveText('Name');
    await expect(headers.nth(1)).toHaveText('Goal');

    // Check buttons have proper labeling
    const newBoardButton = page.locator('button:has-text("New Board")');
    await expect(newBoardButton).toBeVisible();

    // Test with board creation
    await newBoardButton.click();

    // Check form labels are properly associated
    const nameLabel = page.locator('label[for="board-name"]');
    const nameInput = page.locator('input#board-name');
    await expect(nameLabel).toHaveText('Board Name');
    await expect(nameInput).toBeVisible();

    const goalLabel = page.locator('label[for="board-goal"]');
    const goalInput = page.locator('textarea#board-goal');
    await expect(goalLabel).toHaveText('Project Goal');
    await expect(goalInput).toBeVisible();
  });

  test('should maintain focus management in modals', async ({ page }) => {
    // Open board creation modal
    await page.locator('button:has-text("New Board")').click();

    // Check focus is trapped in modal
    const nameInput = page.locator('input#board-name');
    await expect(nameInput).toBeFocused();

    // Tab through modal elements
    await page.keyboard.press('Tab'); // Should go to goal textarea
    const goalInput = page.locator('textarea#board-goal');
    await expect(goalInput).toBeFocused();

    await page.keyboard.press('Tab'); // Should go to Cancel button
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press('Tab'); // Should go to Create button
    const createButton = page.locator('button:has-text("Create Board")');
    await expect(createButton).toBeFocused();

    // Test ESC key closes modal and returns focus
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Create New Board')).not.toBeVisible();

    // Focus should return to the New Board button
    const newBoardButton = page.locator('button:has-text("New Board")');
    await expect(newBoardButton).toBeFocused();
  });

  test('should handle loading states and error states accessibly', async ({ page }) => {
    // Test loading state (this might be quick, but we can check structure)
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Should not show loading spinner indefinitely
    await page.waitForLoadState('networkidle');

    // Check error handling by trying to access invalid route
    await page.goto('/boards/nonexistent-board-id');

    // Should show error message
    await expect(page.locator('text=Error loading board')).toBeVisible();
    await expect(page.locator('a:has-text("Go back to boards list")')).toBeVisible();

    // Test error state is accessible
    const errorMessage = page.locator('[class*="text-red"]');
    await expect(errorMessage).toBeVisible();
  });
});
