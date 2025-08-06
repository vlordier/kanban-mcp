import { test, expect } from '@playwright/test';

test.describe('Final UX Improvements Showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete UX journey - from empty state to full workflow', async ({ page }) => {
    const timestamp = Date.now();

    // 1. Check if we have the beautiful welcome screen (if no boards)
    const boardRows = page.locator('tbody tr');
    const boardCount = await boardRows.count();

    if (boardCount === 0) {
      await page.screenshot({
        path: `screenshots/final-showcase/01-welcome-screen-${timestamp}.png`,
        fullPage: true,
      });
    } else {
      await page.screenshot({
        path: `screenshots/final-showcase/01-improved-homepage-${timestamp}.png`,
        fullPage: true,
      });
    }

    // 2. Create a comprehensive project showcase
    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({
      path: `screenshots/final-showcase/02-create-board-modal-${timestamp}.png`,
    });

    await page.locator('input#board-name').fill('Product Launch 2024');
    await page.locator('textarea#board-goal')
      .fill(`Complete product launch project with comprehensive milestone tracking.

This board demonstrates the improved UX design with:
• Enhanced visual hierarchy and typography
• Better spacing and modern design elements  
• Improved accessibility and responsive design
• Comprehensive task management workflow`);

    await page.screenshot({
      path: `screenshots/final-showcase/03-comprehensive-form-${timestamp}.png`,
    });

    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1500); // Wait for success notification

    // 3. Show the updated board list with success notification
    await page.screenshot({
      path: `screenshots/final-showcase/04-success-notification-${timestamp}.png`,
      fullPage: true,
    });

    // 4. Navigate to board and showcase the complete improved design
    await page.locator('tr:has-text("Product Launch 2024") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);

    // 5. Showcase the dramatically improved board detail design
    await page.screenshot({
      path: `screenshots/final-showcase/05-improved-board-header-${timestamp}.png`,
      fullPage: true,
    });

    // 6. Create a comprehensive task to show improved task creation UX
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    const addFirstTaskButton = todoColumn.locator('button:has-text("Add the first task")');
    await addFirstTaskButton.click();

    await page.screenshot({
      path: `screenshots/final-showcase/06-improved-task-creation-${timestamp}.png`,
    });

    await page.locator('input#task-title').fill('🚀 Market Research & Competitive Analysis');
    await page.locator('textarea#task-content').fill(`# Market Research & Competitive Analysis

## Objectives
Conduct comprehensive market research to inform our product launch strategy and positioning.

## Key Deliverables
- **Market Size Analysis** - Total addressable market (TAM) assessment
- **Competitive Landscape** - Direct and indirect competitor analysis  
- **Customer Personas** - Detailed user profiles and pain points
- **Pricing Strategy** - Competitive pricing analysis and recommendations
- **Go-to-Market Plan** - Channel strategy and launch timeline

## Research Methods
- [ ] Primary research (surveys, interviews)
- [ ] Secondary research (industry reports, analyst data)
- [ ] Competitive product teardowns
- [ ] Customer journey mapping
- [ ] SWOT analysis

## Success Criteria
- Complete analysis of top 10 competitors
- Interview 50+ potential customers
- Validate product-market fit hypotheses
- Present findings to leadership team

**Priority**: 🔥 High  
**Estimated Effort**: 3 weeks  
**Assigned To**: Product Strategy Team  
**Due Date**: March 15, 2024`);

    await page.screenshot({
      path: `screenshots/final-showcase/07-comprehensive-task-form-${timestamp}.png`,
    });

    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);

    // 7. Add more tasks to showcase the improved column design with content
    const addMoreButton = todoColumn.locator('button[title="Add new task"]');

    // Task 2
    await addMoreButton.click();
    await page.locator('input#task-title').fill('🎨 Design System & Brand Guidelines');
    await page.locator('textarea#task-content')
      .fill(`Create comprehensive design system and brand guidelines for the product launch.

## Components to Design:
- Logo variations and usage guidelines
- Color palette and typography system  
- Icon library and illustration style
- UI component library
- Marketing collateral templates

**Priority**: High | **Est**: 2 weeks`);

    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(500);

    // Task 3
    await addMoreButton.click();
    await page.locator('input#task-title').fill('🔧 MVP Development Sprint');
    await page.locator('textarea#task-content')
      .fill(`Core feature development for minimum viable product.

## Key Features:
- User authentication & onboarding
- Core product functionality
- Basic analytics integration
- Performance optimization

**Priority**: Critical | **Est**: 4-6 weeks`);

    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);

    // 8. Show the populated board with improved task cards
    await page.screenshot({
      path: `screenshots/final-showcase/08-populated-todo-column-${timestamp}.png`,
      fullPage: true,
    });

    // 9. Move a task to In Progress to show improved drag & drop UX
    const firstTask = page.locator('div:has-text("🚀 Market Research")').first();
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');

    await firstTask.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/final-showcase/09-task-moved-in-progress-${timestamp}.png`,
      fullPage: true,
    });

    // 10. Add a task to In Progress to show WIP limit tracking
    const inProgressAddButton = inProgressColumn.locator('button:has-text("Add the first task")');
    await inProgressAddButton.click();

    await page.locator('input#task-title').fill('🧪 User Testing & Feedback Collection');
    await page.locator('textarea#task-content')
      .fill(`Conduct user testing sessions to validate product assumptions and gather feedback.

**Status**: Currently interviewing beta users  
**Progress**: 60% complete  
**Next Steps**: Analyze feedback and iterate`);

    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);

    // 11. Move a task to Done to show completion
    const testingTask = page.locator('div:has-text("🧪 User Testing")').first();
    const doneColumn = page.locator('div:has(h3:has-text("Done"))');

    await testingTask.dragTo(doneColumn);
    await page.waitForTimeout(1000);

    // 12. Final screenshot showing complete improved workflow
    await page.screenshot({
      path: `screenshots/final-showcase/10-complete-workflow-final-${timestamp}.png`,
      fullPage: true,
    });

    // 13. Test task detail view improvements
    await page.locator('div:has-text("🚀 Market Research")').first().click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `screenshots/final-showcase/11-improved-task-detail-${timestamp}.png`,
      fullPage: true,
    });

    await page.keyboard.press('Escape');

    // 14. Navigate back to show improved breadcrumb UX
    await page.locator('nav a:has-text("Boards")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/final-showcase/12-final-board-list-${timestamp}.png`,
      fullPage: true,
    });

    // 15. Test search functionality with the new board
    await page.locator('input[placeholder*="Search boards"]').fill('Product');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `screenshots/final-showcase/13-improved-search-results-${timestamp}.png`,
      fullPage: true,
    });

    await page.locator('button:has-text("Clear")').click();
  });

  test('Mobile-first responsive showcase', async ({ page }) => {
    const timestamp = Date.now();

    // Create a board for mobile testing
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Mobile UX Demo');
    await page
      .locator('textarea#board-goal')
      .fill('Showcasing improved mobile-first responsive design');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    // Test mobile viewports
    const mobileViewports = [
      { name: 'iphone', width: 375, height: 667 },
      { name: 'android', width: 360, height: 640 },
      { name: 'tablet', width: 768, height: 1024 },
    ];

    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      // Mobile homepage
      await page.screenshot({
        path: `screenshots/final-showcase/mobile-homepage-${viewport.name}-${timestamp}.png`,
        fullPage: true,
      });

      // Mobile board detail
      await page.locator('tr:has-text("Mobile UX Demo") a:has-text("View")').first().click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `screenshots/final-showcase/mobile-board-detail-${viewport.name}-${timestamp}.png`,
        fullPage: true,
      });

      // Back to homepage
      await page.locator('nav a:has-text("Boards")').click();
      await page.waitForTimeout(500);
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
