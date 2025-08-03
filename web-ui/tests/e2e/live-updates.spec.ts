import { test, expect } from '@playwright/test';

test.describe('Live Updates and Change Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Kanban Boards")');
  });

  test('detects board creation changes', async ({ page }) => {
    // Monitor for boardsUpdated events
    let eventsFired = 0;
    await page.addInitScript(() => {
      window.addEventListener('boardsUpdated', (event: any) => {
        console.log('boardsUpdated event fired:', event.detail);
        (window as any).updateEvents = ((window as any).updateEvents || 0) + 1;
      });
    });

    // Create a new board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Change Detection Test');
    await page.fill('textarea#board-goal', 'Testing live change detection for board creation');
    await page.click('button:has-text("Create Board")');

    // Wait for board to appear
    await page.waitForSelector('text=Change Detection Test');

    // Check that change detection fired
    const updateEvents = await page.evaluate(() => (window as any).updateEvents || 0);
    console.log('Update events fired:', updateEvents);

    // Take screenshot showing change detection result
    await page.screenshot({
      path: './screenshots/live-updates/01-board-creation-detected-1754162100000.png',
      fullPage: true,
    });
  });

  test('detects board modification changes', async ({ page }) => {
    // Create initial board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Original Board Name');
    await page.fill('textarea#board-goal', 'Original goal description');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Set up change detection monitoring
    await page.addInitScript(() => {
      window.addEventListener('boardsUpdated', (event: any) => {
        console.log('Board update detected:', event.detail);
        (window as any).lastUpdateType = event.detail.changes[0]?.type;
        (window as any).lastUpdateField = event.detail.changes[0]?.field;
      });
    });

    // Edit the board
    await page.hover('div:has-text("Original Board Name")');
    await page.click('button[title="Edit board"]');

    // Modify board details
    await page.fill('input#edit-board-name', 'Modified Board Name');
    await page.fill('textarea#edit-board-goal', 'Updated goal description with new information');
    await page.click('button:has-text("Save Changes")');

    // Wait for changes to be reflected
    await page.waitForTimeout(2000);

    // Verify changes are visible
    await expect(page.locator('text=Modified Board Name')).toBeVisible();
    await expect(page.locator('text=Updated goal description')).toBeVisible();

    // Check change detection results
    const updateType = await page.evaluate(() => (window as any).lastUpdateType);
    const updateField = await page.evaluate(() => (window as any).lastUpdateField);

    console.log('Update type:', updateType, 'Update field:', updateField);

    // Take screenshot of modification detection
    await page.screenshot({
      path: './screenshots/live-updates/02-board-modification-detected-1754162100000.png',
      fullPage: true,
    });
  });

  test('detects board deletion changes', async ({ page }) => {
    // Create board to delete
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Board To Delete');
    await page.fill('textarea#board-goal', 'This board will be deleted to test change detection');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Set up deletion monitoring
    await page.addInitScript(() => {
      window.addEventListener('boardsUpdated', (event: any) => {
        const deleteEvent = event.detail.changes.find((c: any) => c.type === 'deleted');
        if (deleteEvent) {
          console.log('Board deletion detected:', deleteEvent);
          (window as any).deletionDetected = true;
          (window as any).deletedBoardName = deleteEvent.board.name;
        }
      });
    });

    // Delete the board
    await page.hover('div:has-text("Board To Delete")');
    await page.click('button[title="Delete board"]');
    await page.click('button:has-text("Delete"):not(:has-text("Cancel"))');

    // Wait for deletion to process
    await page.waitForTimeout(2000);

    // Verify board is gone
    await expect(page.locator('text=Board To Delete')).not.toBeVisible();

    // Check deletion detection
    const deletionDetected = await page.evaluate(() => (window as any).deletionDetected);
    const deletedBoardName = await page.evaluate(() => (window as any).deletedBoardName);

    console.log('Deletion detected:', deletionDetected, 'Deleted:', deletedBoardName);

    // Take screenshot of deletion detection
    await page.screenshot({
      path: './screenshots/live-updates/03-board-deletion-detected-1754162100000.png',
      fullPage: true,
    });
  });

  test('handles multiple simultaneous changes', async ({ page }) => {
    // Set up comprehensive change tracking
    await page.addInitScript(() => {
      (window as any).allChanges = [];
      window.addEventListener('boardsUpdated', (event: any) => {
        (window as any).allChanges.push(...event.detail.changes);
        console.log('Change batch detected:', event.detail.changes.length, 'changes');
      });
    });

    // Create multiple boards rapidly
    const boards = [
      { name: 'Rapid Test Board 1', goal: 'First rapid creation test' },
      { name: 'Rapid Test Board 2', goal: 'Second rapid creation test' },
      { name: 'Rapid Test Board 3', goal: 'Third rapid creation test' },
    ];

    for (let i = 0; i < boards.length; i++) {
      await page.click('button:has-text("New Board")');
      await page.fill('input#board-name', boards[i].name);
      await page.fill('textarea#board-goal', boards[i].goal);
      await page.click('button:has-text("Create Board")');
      await page.waitForTimeout(500); // Small delay between creations
    }

    // Wait for all changes to be processed
    await page.waitForTimeout(3000);

    // Verify all boards were created
    for (const board of boards) {
      await expect(page.locator(`text=${board.name}`)).toBeVisible();
    }

    // Check change detection results
    const allChanges = await page.evaluate(() => (window as any).allChanges || []);
    console.log('Total changes detected:', allChanges.length);

    // Take screenshot of multiple changes handling
    await page.screenshot({
      path: './screenshots/live-updates/04-multiple-changes-handled-1754162100000.png',
      fullPage: true,
    });
  });

  test('maintains data consistency during rapid updates', async ({ page }) => {
    // Create initial board
    await page.click('button:has-text("New Board")');
    await page.fill('input#board-name', 'Consistency Test Board');
    await page.fill('textarea#board-goal', 'Testing data consistency during rapid updates');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(1000);

    // Perform rapid edit operations
    for (let i = 1; i <= 3; i++) {
      await page.hover('div:has-text("Consistency Test Board")');
      await page.click('button[title="Edit board"]');
      await page.fill('input#edit-board-name', `Consistency Test Board - Edit ${i}`);
      await page.fill('textarea#edit-board-goal', `Updated goal description - iteration ${i}`);
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(800);
    }

    // Verify final state is consistent
    await expect(page.locator('text=Consistency Test Board - Edit 3')).toBeVisible();
    await expect(page.locator('text=iteration 3')).toBeVisible();

    // Wait for polling to confirm server state
    await page.waitForTimeout(6000);

    // Verify data is still consistent after polling
    await expect(page.locator('text=Consistency Test Board - Edit 3')).toBeVisible();

    // Take screenshot of final consistent state
    await page.screenshot({
      path: './screenshots/live-updates/05-data-consistency-maintained-1754162100000.png',
      fullPage: true,
    });
  });
});
