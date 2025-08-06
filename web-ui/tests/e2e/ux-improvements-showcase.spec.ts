import { test, expect } from '@playwright/test';

test.describe('UX Improvements Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Showcase improved homepage and board list UX', async ({ page }) => {
    const timestamp = Date.now();

    // 1. Capture improved homepage with better typography and visual hierarchy
    await page.screenshot({
      path: `screenshots/ux-improvements/01-improved-homepage-${timestamp}.png`,
      fullPage: true,
    });

    // 2. Showcase improved search bar with icon
    await page.locator('input[placeholder*="Search boards"]').focus();
    await page.screenshot({
      path: `screenshots/ux-improvements/02-improved-search-focus-${timestamp}.png`,
      fullPage: true,
    });

    // 3. Create a board to showcase improved empty states
    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({
      path: `screenshots/ux-improvements/03-create-board-dialog-${timestamp}.png`,
    });

    await page.locator('input#board-name').fill('UX Showcase Board');
    await page
      .locator('textarea#board-goal')
      .fill(
        'Demonstrating the improved user experience with better visual hierarchy, spacing, and interactive elements'
      );
    await page.screenshot({
      path: `screenshots/ux-improvements/04-improved-form-design-${timestamp}.png`,
    });

    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    // 4. Show improved table design with better buttons and hover effects
    await page.screenshot({
      path: `screenshots/ux-improvements/05-improved-board-table-${timestamp}.png`,
      fullPage: true,
    });

    // 5. Navigate to board to show improved board detail UX
    await page.locator('tr:has-text("UX Showcase Board") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);

    // 6. Showcase improved board detail with breadcrumbs and better navigation
    await page.screenshot({
      path: `screenshots/ux-improvements/06-improved-board-detail-header-${timestamp}.png`,
      fullPage: true,
    });

    // 7. Show improved empty column states
    await page.screenshot({
      path: `screenshots/ux-improvements/07-improved-empty-columns-${timestamp}.png`,
      fullPage: true,
    });

    // 8. Test improved task creation experience
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    const addButton = todoColumn.locator('button:has-text("Add the first task")');
    await addButton.click();

    await page.screenshot({
      path: `screenshots/ux-improvements/08-task-creation-from-empty-state-${timestamp}.png`,
    });

    await page.locator('input#task-title').fill('Design System Implementation');
    await page.locator('textarea#task-content').fill(`# Design System Implementation

## Objectives
- Implement improved visual hierarchy
- Add better spacing and typography
- Enhance interactive elements with hover states
- Improve accessibility and keyboard navigation

## Visual Improvements
- **Typography**: Larger headings, better font weights
- **Spacing**: More generous padding and margins  
- **Colors**: Better contrast and semantic color usage
- **Buttons**: Improved states and transitions
- **Icons**: Consistent iconography throughout

## Technical Details
- Tailwind CSS optimizations
- Focus management improvements
- Responsive design enhancements
- Component API improvements

**Priority**: High  
**Estimated effort**: 1 week`);

    await page.screenshot({
      path: `screenshots/ux-improvements/09-improved-task-form-${timestamp}.png`,
    });

    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);

    // 9. Show the task in the improved column design
    await page.screenshot({
      path: `screenshots/ux-improvements/10-task-in-improved-column-${timestamp}.png`,
      fullPage: true,
    });

    // 10. Add more tasks to show improved column with content
    const addMoreButton = todoColumn.locator('button[title="Add new task"]');
    await addMoreButton.click();

    await page.locator('input#task-title').fill('User Testing Session');
    await page
      .locator('textarea#task-content')
      .fill('Conduct user testing to validate the improved UX design');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(500);

    // Add one more task
    await addMoreButton.click();
    await page.locator('input#task-title').fill('Performance Optimization');
    await page
      .locator('textarea#task-content')
      .fill('Optimize loading times and smooth transitions');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);

    // 11. Final screenshot showing populated improved columns
    await page.screenshot({
      path: `screenshots/ux-improvements/11-populated-improved-columns-${timestamp}.png`,
      fullPage: true,
    });

    // 12. Test task interaction - show improved task detail
    await page.locator('div:has-text("Design System Implementation")').first().click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `screenshots/ux-improvements/12-improved-task-detail-view-${timestamp}.png`,
      fullPage: true,
    });

    await page.keyboard.press('Escape');

    // 13. Test breadcrumb navigation
    await page.locator('nav a:has-text("Boards")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/ux-improvements/13-breadcrumb-navigation-back-${timestamp}.png`,
      fullPage: true,
    });
  });

  test('Demonstrate responsive improvements across viewports', async ({ page }) => {
    const timestamp = Date.now();

    // Create content for responsive testing
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Responsive Showcase');
    await page.locator('textarea#board-goal').fill('Testing improved responsive design');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      // Homepage responsive design
      await page.screenshot({
        path: `screenshots/ux-improvements/responsive-homepage-${viewport.name}-${timestamp}.png`,
        fullPage: true,
      });

      // Board detail responsive design
      await page.locator('tr:has-text("Responsive Showcase") a:has-text("View")').first().click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `screenshots/ux-improvements/responsive-board-detail-${viewport.name}-${timestamp}.png`,
        fullPage: true,
      });

      // Back to homepage for next viewport
      await page.locator('nav a:has-text("Boards")').click();
      await page.waitForTimeout(500);
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Compare UX improvements with edge cases', async ({ page }) => {
    const timestamp = Date.now();

    // 1. Show improved empty state when no boards exist (clean slate)
    // First delete any existing boards if they exist
    const deleteButtons = page.locator('button:has-text("Delete")');
    const deleteCount = await deleteButtons.count();

    for (let i = 0; i < Math.min(deleteCount, 3); i++) {
      if ((await deleteButtons.nth(0).count()) > 0) {
        await deleteButtons.nth(0).click();
        await page.locator('div[role="dialog"] button:has-text("Delete")').click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({
      path: `screenshots/ux-improvements/empty-state-improved-${timestamp}.png`,
      fullPage: true,
    });

    // 2. Show improved search "no results" state
    await page.locator('input[placeholder*="Search boards"]').fill('NonexistentBoard12345');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `screenshots/ux-improvements/no-search-results-improved-${timestamp}.png`,
      fullPage: true,
    });

    await page.locator('button:has-text("Clear search")').click();

    // 3. Create multiple boards to show improved list design
    const boards = [
      { name: 'Product Development', goal: 'Build innovative products that delight users' },
      { name: 'Marketing Strategy', goal: 'Develop comprehensive marketing campaigns' },
      { name: 'Customer Support', goal: 'Provide exceptional customer service' },
    ];

    for (const board of boards) {
      await page.locator('button:has-text("New Board")').click();
      await page.locator('input#board-name').fill(board.name);
      await page.locator('textarea#board-goal').fill(board.goal);
      await page.locator('button:has-text("Create Board")').click();
      await page.waitForTimeout(500);
    }

    // 4. Final screenshot showing improved board list with multiple items
    await page.screenshot({
      path: `screenshots/ux-improvements/multiple-boards-improved-design-${timestamp}.png`,
      fullPage: true,
    });

    // 5. Show improved hover effects by focusing on a row
    await page.locator('tr:has-text("Product Development")').hover();
    await page.waitForTimeout(200);

    await page.screenshot({
      path: `screenshots/ux-improvements/table-hover-effects-${timestamp}.png`,
      fullPage: true,
    });
  });

  test('Showcase accessibility improvements', async ({ page }) => {
    const timestamp = Date.now();

    // Create a board for accessibility testing
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Accessibility Test');
    await page.locator('textarea#board-goal').fill('Testing improved accessibility features');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    // 1. Test keyboard focus improvements
    await page.keyboard.press('Tab'); // Focus search
    await page.screenshot({
      path: `screenshots/ux-improvements/accessibility-search-focus-${timestamp}.png`,
      fullPage: true,
    });

    await page.keyboard.press('Tab'); // Focus New Board button
    await page.screenshot({
      path: `screenshots/ux-improvements/accessibility-button-focus-${timestamp}.png`,
      fullPage: true,
    });

    // 2. Test modal focus management
    await page.keyboard.press('Enter'); // Open modal
    await page.screenshot({
      path: `screenshots/ux-improvements/accessibility-modal-focus-${timestamp}.png`,
    });

    await page.keyboard.press('Escape'); // Close modal

    // 3. Test board detail accessibility
    await page.locator('tr:has-text("Accessibility Test") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/ux-improvements/accessibility-board-detail-${timestamp}.png`,
      fullPage: true,
    });

    // 4. Test column focus and interaction
    const addButton = page.locator('button[title="Add new task"]').first();
    await addButton.focus();
    await page.screenshot({
      path: `screenshots/ux-improvements/accessibility-column-button-focus-${timestamp}.png`,
      fullPage: true,
    });
  });
});
