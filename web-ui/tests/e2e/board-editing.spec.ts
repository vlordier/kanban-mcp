import { test, expect } from '@playwright/test';

test.describe('Board Editing Capabilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');
    
    // Create a test board for editing
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Test Board for Editing');
    await page.fill('textarea#board-goal', 'This board will be used to test editing functionality');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);
  });

  test('shows edit button on board hover', async ({ page }) => {
    const boardCard = page.locator('div:has-text("Test Board for Editing")').first();
    
    // Initially edit button should not be visible
    await expect(page.locator('button[title="Edit board"]')).not.toBeVisible();
    
    // Hover over board card
    await boardCard.hover();
    await page.waitForTimeout(300); // Wait for hover animation
    
    // Edit button should now be visible
    await expect(page.locator('button[title="Edit board"]')).toBeVisible();
    
    // Take screenshot of hover state with edit button
    await boardCard.screenshot({
      path: './screenshots/board-editing/01-edit-button-on-hover-1754162200000.png'
    });
    
    // Move away and verify button disappears
    await page.hover('h1:has-text("Kanban Boards")'); // Hover elsewhere
    await page.waitForTimeout(300);
    await expect(page.locator('button[title="Edit board"]')).not.toBeVisible();
  });

  test('opens edit dialog when edit button clicked', async ({ page }) => {
    // Hover and click edit
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Verify edit dialog opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Edit Board')).toBeVisible();
    
    // Verify form is pre-populated with current values
    const nameInput = page.locator('input#edit-board-name');
    const goalTextarea = page.locator('textarea#edit-board-goal');
    
    await expect(nameInput).toHaveValue('Test Board for Editing');
    await expect(goalTextarea).toHaveValue('This board will be used to test editing functionality');
    
    // Take screenshot of edit dialog
    await page.screenshot({
      path: './screenshots/board-editing/02-edit-dialog-opened-1754162200000.png'
    });
  });

  test('validates required fields in edit dialog', async ({ page }) => {
    // Open edit dialog
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Clear name field
    await page.fill('input#edit-board-name', '');
    
    // Save button should be disabled
    await expect(page.locator('button:has-text("Save Changes")')).toBeDisabled();
    
    // Clear goal field too
    await page.fill('textarea#edit-board-goal', '');
    
    // Save button should still be disabled
    await expect(page.locator('button:has-text("Save Changes")')).toBeDisabled();
    
    // Take screenshot of validation state
    await page.screenshot({
      path: './screenshots/board-editing/03-validation-disabled-state-1754162200000.png'
    });
    
    // Fill in name only
    await page.fill('input#edit-board-name', 'Updated Name');
    await expect(page.locator('button:has-text("Save Changes")')).toBeDisabled();
    
    // Fill in goal - now button should be enabled
    await page.fill('textarea#edit-board-goal', 'Updated goal');
    await expect(page.locator('button:has-text("Save Changes")')).toBeEnabled();
  });

  test('successfully edits board name and goal', async ({ page }) => {
    // Open edit dialog
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Update board details
    await page.fill('input#edit-board-name', 'Edited Board Name');
    await page.fill('textarea#edit-board-goal', 'This is the updated goal description with new information and details about the project scope.');
    
    // Take screenshot before saving
    await page.screenshot({
      path: './screenshots/board-editing/04-edit-dialog-with-changes-1754162200000.png'
    });
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Verify dialog closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Verify changes are reflected in the UI
    await expect(page.locator('text=Edited Board Name')).toBeVisible();
    await expect(page.locator('text=updated goal description')).toBeVisible();
    
    // Take screenshot of updated board
    await page.screenshot({
      path: './screenshots/board-editing/05-board-successfully-edited-1754162200000.png',
      fullPage: true
    });
  });

  test('handles edit cancellation properly', async ({ page }) => {
    // Open edit dialog
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Make some changes
    await page.fill('input#edit-board-name', 'Should Not Save');
    await page.fill('textarea#edit-board-goal', 'This should not be saved');
    
    // Cancel the edit
    await page.click('button:has-text("Cancel")');
    
    // Verify dialog closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Verify original content is still there
    await expect(page.locator('text=Test Board for Editing')).toBeVisible();
    await expect(page.locator('text=This board will be used to test editing functionality')).toBeVisible();
    
    // Verify changes were not saved
    await expect(page.locator('text=Should Not Save')).not.toBeVisible();
    
    // Take screenshot showing cancelled edit
    await page.screenshot({
      path: './screenshots/board-editing/06-edit-cancelled-original-preserved-1754162200000.png',
      fullPage: true
    });
  });

  test('handles edit dialog in dark mode', async ({ page }) => {
    // Switch to dark mode
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);
    
    // Open edit dialog in dark mode
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Verify dialog appears with dark styling
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Take screenshot of dark mode edit dialog
    await page.screenshot({
      path: './screenshots/board-editing/07-edit-dialog-dark-mode-1754162200000.png'
    });
    
    // Test editing in dark mode
    await page.fill('input#edit-board-name', 'Dark Mode Edited Board');
    await page.fill('textarea#edit-board-goal', 'Testing board editing functionality in dark mode theme');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Verify changes in dark mode
    await expect(page.locator('text=Dark Mode Edited Board')).toBeVisible();
    
    // Take screenshot of dark mode result
    await page.screenshot({
      path: './screenshots/board-editing/08-dark-mode-edit-result-1754162200000.png',
      fullPage: true
    });
  });

  test('handles rapid edit operations', async ({ page }) => {
    // Perform multiple rapid edits
    const editOperations = [
      { name: 'Rapid Edit 1', goal: 'First rapid edit test' },
      { name: 'Rapid Edit 2', goal: 'Second rapid edit test' },
      { name: 'Rapid Edit 3', goal: 'Third rapid edit test' }
    ];

    for (let i = 0; i < editOperations.length; i++) {
      const edit = editOperations[i];
      
      // Open edit dialog
      await page.hover('div:has-text("Test Board for Editing"), div:has-text("Rapid Edit")');
      await page.click('button[title="Edit board"]');
      
      // Make changes
      await page.fill('input#edit-board-name', edit.name);
      await page.fill('textarea#edit-board-goal', edit.goal);
      
      // Save
      await page.click('button:has-text("Save Changes")');
      
      // Wait for UI update
      await page.waitForTimeout(500);
      
      // Verify change
      await expect(page.locator(`text=${edit.name}`)).toBeVisible();
    }
    
    // Verify final state
    await expect(page.locator('text=Rapid Edit 3')).toBeVisible();
    await expect(page.locator('text=Third rapid edit test')).toBeVisible();
    
    // Take screenshot of final rapid edit state
    await page.screenshot({
      path: './screenshots/board-editing/09-rapid-edits-final-state-1754162200000.png',
      fullPage: true
    });
  });

  test('maintains edit functionality across page interactions', async ({ page }) => {
    // Perform various page interactions, then test editing
    
    // Switch dark mode on/off
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(300);
    await page.click('button[title*="Switch to light mode"]');
    
    // Use search
    await page.fill('input[placeholder*="Search boards"]', 'Test Board');
    await page.waitForTimeout(500);
    await page.click('button[title="Clear search"]');
    
    // Open/close notifications
    await page.click('button[title="Notifications"]');
    await page.waitForTimeout(500);
    await page.click('button[title="Notifications"]');
    
    // Now test that editing still works
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Verify edit dialog still functions
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('input#edit-board-name')).toHaveValue('Test Board for Editing');
    
    // Make a test edit
    await page.fill('input#edit-board-name', 'Post-Interaction Edit Test');
    await page.click('button:has-text("Save Changes")');
    
    // Verify edit worked
    await expect(page.locator('text=Post-Interaction Edit Test')).toBeVisible();
    
    // Take screenshot showing edit works after interactions
    await page.screenshot({
      path: './screenshots/board-editing/10-edit-after-interactions-1754162200000.png',
      fullPage: true
    });
  });

  test('handles edge cases and special characters', async ({ page }) => {
    // Open edit dialog
    await page.hover('div:has-text("Test Board for Editing")');
    await page.click('button[title="Edit board"]');
    
    // Test with special characters and edge cases
    const specialName = 'Board with "quotes" & <symbols> 💡 émojis';
    const longGoal = 'This is a very long goal description that tests how the application handles lengthy text input with various special characters like @#$%^&*()_+-=[]{}|;:,.<>? and unicode characters like café, naïve, résumé, and even some emoji 🚀 🎯 ✨ to ensure robust text handling across different scenarios and edge cases.';
    
    await page.fill('input#edit-board-name', specialName);
    await page.fill('textarea#edit-board-goal', longGoal);
    
    // Take screenshot before saving
    await page.screenshot({
      path: './screenshots/board-editing/11-special-characters-input-1754162200000.png'
    });
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    
    // Verify special characters are handled correctly
    await expect(page.locator('text=Board with "quotes"')).toBeVisible();
    await expect(page.locator('text=💡 émojis')).toBeVisible();
    await expect(page.locator('text=This is a very long goal')).toBeVisible();
    
    // Take screenshot of special characters result
    await page.screenshot({
      path: './screenshots/board-editing/12-special-characters-result-1754162200000.png',
      fullPage: true
    });
  });
});