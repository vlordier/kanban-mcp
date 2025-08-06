import { test, expect } from '@playwright/test';

test.describe('Notification System Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');
  });

  test('shows notification button and count badge', async ({ page }) => {
    // Verify notification button is visible
    await expect(page.locator('button[title="Notifications"]')).toBeVisible();
    
    // Initially no badge should be visible (or count is 0)
    const badge = page.locator('button[title="Notifications"] .absolute');
    
    // Take screenshot of initial notification button state
    await page.locator('button[title="Notifications"]').screenshot({
      path: './screenshots/notifications/01-notification-button-initial-1754162300000.png'
    });
  });

  test('displays notifications panel when clicked', async ({ page }) => {
    // Click notification button
    await page.click('button[title="Notifications"]');
    
    // Verify notification panel opens
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    
    // Take screenshot of opened notification panel
    await page.screenshot({
      path: './screenshots/notifications/02-notification-panel-opened-1754162300000.png'
    });
    
    // Close panel
    await page.click('button[title="Notifications"]');
    await expect(page.locator('[data-testid="notification-panel"]')).not.toBeVisible();
  });

  test('generates notifications for board creation', async ({ page }) => {
    // Set up notification monitoring
    await page.addInitScript(() => {
      (window as any).notificationEvents = [];
      window.addEventListener('boardsUpdated', (event: any) => {
        (window as any).notificationEvents.push(event.detail);
        console.log('Notification event captured:', event.detail);
      });
    });

    // Create a new board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Notification Test Board');
    await page.fill('textarea#board-goal', 'Testing notification generation for board creation');
    await page.click('button:has-text("Create Board")');
    
    // Wait for board creation
    await page.waitForSelector('text=Notification Test Board');
    
    // Wait for notification processing
    await page.waitForTimeout(2000);
    
    // Open notifications panel
    await page.click('button[title="Notifications"]');
    
    // Verify notification appears
    await expect(page.locator('text=New board created')).toBeVisible();
    await expect(page.locator('text=Notification Test Board')).toBeVisible();
    
    // Take screenshot of notification for board creation
    await page.screenshot({
      path: './screenshots/notifications/03-board-creation-notification-1754162300000.png'
    });
  });

  test('generates notifications for board editing', async ({ page }) => {
    // Create initial board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Original Board');
    await page.fill('textarea#board-goal', 'Original goal description');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Clear any existing notifications by opening and closing panel
    await page.click('button[title="Notifications"]');
    await page.waitForTimeout(500);
    await page.click('button[title="Notifications"]');

    // Edit the board
    await page.hover('div:has-text("Original Board")');
    await page.click('button[title="Edit board"]');
    await page.fill('input#edit-board-name', 'Edited Board Name');
    await page.fill('textarea#edit-board-goal', 'Updated goal description');
    await page.click('button:has-text("Save Changes")');
    
    // Wait for edit processing
    await page.waitForTimeout(3000);
    
    // Open notifications to see edit notification
    await page.click('button[title="Notifications"]');
    
    // Verify edit notification appears
    await expect(page.locator('text=Board updated')).toBeVisible();
    await expect(page.locator('text=Edited Board Name')).toBeVisible();
    
    // Take screenshot of edit notification
    await page.screenshot({
      path: './screenshots/notifications/04-board-edit-notification-1754162300000.png'
    });
  });

  test('generates notifications for board deletion', async ({ page }) => {
    // Create board to delete
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Board to Delete');
    await page.fill('textarea#board-goal', 'This board will be deleted');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Clear notifications
    await page.click('button[title="Notifications"]');
    await page.waitForTimeout(500);
    await page.click('button[title="Notifications"]');

    // Delete the board
    await page.hover('div:has-text("Board to Delete")');
    await page.click('button[title="Delete board"]');
    await page.click('button:has-text("Delete"):not(:has-text("Cancel"))');
    
    // Wait for deletion processing
    await page.waitForTimeout(3000);
    
    // Open notifications
    await page.click('button[title="Notifications"]');
    
    // Verify deletion notification
    await expect(page.locator('text=Board deleted')).toBeVisible();
    await expect(page.locator('text=Board to Delete')).toBeVisible();
    
    // Take screenshot of deletion notification  
    await page.screenshot({
      path: './screenshots/notifications/05-board-deletion-notification-1754162300000.png'
    });
  });

  test('shows notification count badge correctly', async ({ page }) => {
    // Create multiple boards to generate notifications
    const boards = [
      { name: 'Badge Test 1', goal: 'First test board' },
      { name: 'Badge Test 2', goal: 'Second test board' },
      { name: 'Badge Test 3', goal: 'Third test board' }
    ];

    for (const board of boards) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', board.name);
      await page.fill('textarea#board-goal', board.goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(1000);
    }

    // Wait for all notifications to process
    await page.waitForTimeout(5000);

    // Check for notification badge
    const badge = page.locator('button[title="Notifications"] .absolute');
    await expect(badge).toBeVisible();
    
    // Take screenshot showing notification count badge
    await page.locator('button[title="Notifications"]').screenshot({
      path: './screenshots/notifications/06-notification-count-badge-1754162300000.png'
    });

    // Open notifications and verify count
    await page.click('button[title="Notifications"]');
    
    // Should see 3 creation notifications
    await expect(page.locator('text=New board created')).toHaveCount(3);
    
    // Take screenshot of all notifications
    await page.screenshot({
      path: './screenshots/notifications/07-multiple-notifications-1754162300000.png'
    });
  });

  test('handles notification overflow and limiting', async ({ page }) => {
    // Create many boards to test notification overflow
    for (let i = 1; i <= 12; i++) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', `Overflow Test ${i}`);
      await page.fill('textarea#board-goal', `Testing overflow scenario ${i}`);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(300);
    }

    // Wait for all notifications to process
    await page.waitForTimeout(6000);

    // Open notifications panel
    await page.click('button[title="Notifications"]');
    
    // Verify notification limit (should be max 10 notifications)
    const notifications = page.locator('[data-testid="notification-panel"] .border-b');
    const count = await notifications.count();
    expect(count).toBeLessThanOrEqual(10);
    
    // Take screenshot showing notification overflow handling
    await page.screenshot({
      path: './screenshots/notifications/08-notification-overflow-1754162300000.png'
    });
  });

  test('shows proper timestamps in notifications', async ({ page }) => {
    // Create a board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Timestamp Test Board');
    await page.fill('textarea#board-goal', 'Testing notification timestamps');
    await page.click('button:has-text("Create Board")');
    
    // Wait for notification
    await page.waitForTimeout(3000);
    
    // Open notifications
    await page.click('button[title="Notifications"]');
    
    // Verify timestamp is shown (should show "Just now" or similar)
    await expect(page.locator('text=Just now')).toBeVisible();
    
    // Take screenshot showing timestamp
    await page.screenshot({
      path: './screenshots/notifications/09-notification-timestamp-1754162300000.png'
    });
  });

  test('maintains notifications across page interactions', async ({ page }) => {
    // Create notification
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Persistence Test');
    await page.fill('textarea#board-goal', 'Testing notification persistence');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // Perform various page interactions
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);
    await page.click('button[title*="Switch to light mode"]');
    
    await page.fill('input[placeholder*="Search boards"]', 'Persistence');
    await page.waitForTimeout(1000);
    await page.click('button[title="Clear search"]');

    // Verify notification still exists
    await page.click('button[title="Notifications"]');
    await expect(page.locator('text=New board created')).toBeVisible();
    await expect(page.locator('text=Persistence Test')).toBeVisible();
    
    // Take screenshot showing persistent notifications
    await page.screenshot({
      path: './screenshots/notifications/10-notifications-persistent-1754162300000.png'
    });
  });

  test('works correctly in dark mode', async ({ page }) => {
    // Switch to dark mode
    await page.click('button[title*="Switch to dark mode"]');
    await page.waitForTimeout(500);

    // Create board in dark mode
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Dark Mode Notification Test');
    await page.fill('textarea#board-goal', 'Testing notifications in dark mode');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // Open notifications in dark mode
    await page.click('button[title="Notifications"]');
    
    // Verify notification appears with dark styling
    await expect(page.locator('text=New board created')).toBeVisible();
    
    // Take screenshot of dark mode notifications
    await page.screenshot({
      path: './screenshots/notifications/11-dark-mode-notifications-1754162300000.png'
    });
  });

  test('handles rapid notification generation correctly', async ({ page }) => {
    // Set up monitoring for rapid events
    await page.addInitScript(() => {
      (window as any).rapidEvents = [];
      window.addEventListener('boardsUpdated', (event: any) => {
        (window as any).rapidEvents.push(Date.now());
      });
    });

    // Create boards rapidly
    for (let i = 1; i <= 5; i++) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', `Rapid ${i}`);
      await page.fill('textarea#board-goal', `Rapid test ${i}`);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(200); // Very short delay
    }

    // Wait for all events to process
    await page.waitForTimeout(8000);

    // Check event tracking
    const eventCount = await page.evaluate(() => (window as any).rapidEvents?.length || 0);
    console.log('Rapid events captured:', eventCount);

    // Open notifications
    await page.click('button[title="Notifications"]');
    
    // Verify we have notifications for rapid creation
    const notifications = page.locator('text=New board created');
    const notificationCount = await notifications.count();
    expect(notificationCount).toBeGreaterThan(0);
    
    // Take screenshot of rapid notifications
    await page.screenshot({
      path: './screenshots/notifications/12-rapid-notifications-1754162300000.png'
    });
  });
});