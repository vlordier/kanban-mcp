import { test, expect } from '@playwright/test';

test.describe('Board Management UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display board list page with proper layout', async ({ page }) => {
    // Check main navigation and header
    await expect(page.locator('h1').first()).toContainText('MCP Kanban');
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Check board list heading
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
    
    // Check keyboard shortcuts are displayed
    await expect(page.locator('text=⌘K Search')).toBeVisible();
    await expect(page.locator('text=ESC Clear')).toBeVisible();
  });

  test('should show create board button and search functionality', async ({ page }) => {
    // Check New Board button
    const newBoardButton = page.locator('button:has-text("New Board")');
    await expect(newBoardButton).toBeVisible();
    
    // Check search input
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await expect(searchInput).toBeVisible();
  });

  test('should open board creation dialog when clicking New Board', async ({ page }) => {
    // Click New Board button
    await page.locator('button:has-text("New Board")').click();
    
    // Check dialog is open
    await expect(page.locator('text=Create New Board')).toBeVisible();
    
    // Check form fields
    await expect(page.locator('input#board-name')).toBeVisible();
    await expect(page.locator('textarea#board-goal')).toBeVisible();
    
    // Check buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Board")')).toBeVisible();
  });

  test('should validate board creation form', async ({ page }) => {
    // Open create dialog
    await page.locator('button:has-text("New Board")').click();
    
    // Try to submit without filling fields
    const createButton = page.locator('button:has-text("Create Board")');
    await expect(createButton).toBeDisabled();
    
    // Fill only name
    await page.locator('input#board-name').fill('Test Board');
    await expect(createButton).toBeDisabled();
    
    // Fill both fields
    await page.locator('textarea#board-goal').fill('Test goal for the board');
    await expect(createButton).toBeEnabled();
  });

  test('should create a board successfully', async ({ page }) => {
    // Open create dialog
    await page.locator('button:has-text("New Board")').click();
    
    // Fill form with unique name
    const uniqueName = `Test Board E2E ${Date.now()}`;
    await page.locator('input#board-name').fill(uniqueName);
    await page.locator('textarea#board-goal').fill('E2E testing board for validation');
    
    // Submit form
    await page.locator('button:has-text("Create Board")').click();
    
    // Wait for dialog to close and success notification
    await expect(page.locator('text=Create New Board')).not.toBeVisible();
    
    // Check that board appears in the list (with some retry logic)
    await page.waitForTimeout(1000); // Wait for potential API call
    await expect(page.locator(`td:has-text("${uniqueName}")`).first()).toBeVisible();
  });

  test('should search boards functionality work', async ({ page }) => {
    // First create a board to search for
    const uniqueName = `Searchable Board ${Date.now()}`;
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(uniqueName);
    await page.locator('textarea#board-goal').fill('Board for search testing');
    await page.locator('button:has-text("Create Board")').click();
    
    await page.waitForTimeout(1000);
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await searchInput.fill('Searchable');
    
    // Should show filtered results
    await expect(page.locator(`td:has-text("${uniqueName}")`).first()).toBeVisible();
    
    // Test clear search
    await page.locator('button:has-text("Clear")').click();
    await expect(searchInput).toHaveValue('');
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Test Cmd+K for search focus
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    
    // First click somewhere else to lose focus
    await page.locator('body').click();
    
    // Then test Cmd+K
    await page.keyboard.press('Meta+k');
    await expect(searchInput).toBeFocused();
    
    // Type something and test clear functionality
    await searchInput.fill('test search');
    
    // Test Clear button functionality
    const clearButton = page.locator('button:has-text("Clear")');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(searchInput).toHaveValue('');
  });

  test('should handle board deletion flow', async ({ page }) => {
    // First create a board to delete with unique name
    const uniqueName = `Board to Delete ${Date.now()}`;
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(uniqueName);
    await page.locator('textarea#board-goal').fill('Board that will be deleted');
    await page.locator('button:has-text("Create Board")').click();
    
    await page.waitForTimeout(1000);
    
    // Find and click delete button for the board
    const deleteButton = page.locator(`tr:has-text("${uniqueName}") button:has-text("Delete")`).first();
    await deleteButton.click();
    
    // Check confirmation dialog
    await expect(page.locator('text=Delete Board')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();
    
    // Confirm deletion - find the red delete button in the dialog
    await page.locator('div[role="dialog"] button:has-text("Delete")').click();
    
    // Verify board is removed
    await page.waitForTimeout(1000);
    await expect(page.locator(`td:has-text("${uniqueName}")`)).not.toBeVisible();
  });

  test('should navigate to board detail view', async ({ page }) => {
    // Create a board first with unique name
    const uniqueName = `Navigation Test Board ${Date.now()}`;
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(uniqueName);
    await page.locator('textarea#board-goal').fill('Board for navigation testing');
    await page.locator('button:has-text("Create Board")').click();
    
    await page.waitForTimeout(1000);
    
    // Click View link
    await page.locator(`tr:has-text("${uniqueName}") a:has-text("View")`).first().click();
    
    // Should navigate to board detail
    await expect(page.locator(`h2:has-text("${uniqueName}")`)).toBeVisible();
    await expect(page.locator('text=Board for navigation testing')).toBeVisible();
    
    // Should see default columns
    await expect(page.locator('text=On Hold')).toBeVisible();
    await expect(page.locator('text=To Do')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Done')).toBeVisible();
  });
});