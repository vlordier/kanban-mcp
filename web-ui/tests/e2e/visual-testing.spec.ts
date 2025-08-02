import { test, expect } from '@playwright/test';

test.describe('Visual Testing and Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete UI component visual documentation', async ({ page }) => {
    const timestamp = Date.now();
    
    // Document homepage states
    await page.screenshot({ 
      path: `screenshots/visual-docs/01-homepage-empty-state-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Create sample boards for visual documentation
    const boards = [
      { name: 'Product Development', goal: 'Build and launch new product features', type: 'active' },
      { name: 'Marketing Campaign', goal: 'Q4 marketing initiatives and campaigns', type: 'active' },
      { name: 'Bug Fixes', goal: 'Critical bug fixes and maintenance tasks', type: 'maintenance' },
      { name: 'Research Project', goal: 'User research and market analysis', type: 'research' }
    ];
    
    for (let i = 0; i < boards.length; i++) {
      const board = boards[i];
      await page.locator('button:has-text("New Board")').click();
      
      // Document create board dialog
      if (i === 0) {
        await page.screenshot({ 
          path: `screenshots/visual-docs/02-create-board-dialog-${timestamp}.png` 
        });
      }
      
      await page.locator('input#board-name').fill(board.name);
      await page.locator('textarea#board-goal').fill(board.goal);
      
      if (i === 0) {
        await page.screenshot({ 
          path: `screenshots/visual-docs/03-create-board-filled-${timestamp}.png` 
        });
      }
      
      await page.locator('button:has-text("Create Board")').click();
      await page.waitForTimeout(1000);
    }
    
    // Document homepage with multiple boards
    await page.screenshot({ 
      path: `screenshots/visual-docs/04-homepage-with-boards-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Document search functionality
    await page.locator('input[placeholder*="Search boards"]').fill('Product');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `screenshots/visual-docs/05-search-functionality-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Clear search to show clear button
    await page.locator('input[placeholder*="Search boards"]').fill('Marketing');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `screenshots/visual-docs/06-search-with-clear-button-${timestamp}.png`, 
      fullPage: true 
    });
    
    await page.locator('button:has-text("Clear")').click();
    
    // Document board detail views
    await page.locator('tr:has-text("Product Development") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);
    
    // Empty board state
    await page.screenshot({ 
      path: `screenshots/visual-docs/07-empty-board-state-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Document task creation process
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    await todoColumn.locator('button[title="Add new task"]').click();
    
    await page.screenshot({ 
      path: `screenshots/visual-docs/08-create-task-dialog-${timestamp}.png` 
    });
    
    await page.locator('input#task-title').fill('User Interface Design');
    await page.locator('textarea#task-content').fill(`# UI Design Task

## Objectives
- Create wireframes for new feature
- Design high-fidelity mockups
- Conduct usability testing

## Acceptance Criteria
- [ ] Wireframes approved by stakeholders
- [ ] Mockups match brand guidelines  
- [ ] Usability test shows 90%+ task completion

**Priority**: High
**Estimated effort**: 2 weeks`);
    
    await page.screenshot({ 
      path: `screenshots/visual-docs/09-create-task-filled-${timestamp}.png` 
    });
    
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    // Create tasks in different columns to show variety
    const sampleTasks = [
      { column: 'On Hold', title: 'Market Research', content: 'Research competitors and market trends\n\n**Blocked by**: Budget approval pending' },
      { column: 'To Do', title: 'API Development', content: 'Build REST API endpoints\n\n## Endpoints\n- GET /api/projects\n- POST /api/projects\n- PUT /api/projects/:id\n- DELETE /api/projects/:id' },
      { column: 'To Do', title: 'Database Schema', content: 'Design and implement database schema\n\n```sql\nCREATE TABLE projects (\n  id UUID PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW()\n);\n```' },
      { column: 'In Progress', title: 'Frontend Components', content: '**Progress**: 60% complete\n\n- [x] Button component\n- [x] Input component\n- [ ] Modal component\n- [ ] Table component\n\n*Currently working on modal component*' },
      { column: 'In Progress', title: 'User Authentication', content: 'Implement user login/register system\n\n**Status**: Backend complete, frontend in progress\n\n- [x] Backend API\n- [x] Database integration\n- [ ] Frontend forms\n- [ ] Session management' },
      { column: 'Done', title: 'Project Setup', content: '✅ **Completed**\n\nInitial project structure and configuration:\n- Project repository created\n- Dependencies installed\n- Development environment configured\n- CI/CD pipeline setup' }
    ];
    
    for (const task of sampleTasks) {
      const column = page.locator(`div:has(h3:has-text("${task.column}"))`).first();
      await column.locator('button[title="Add new task"]').click();
      await page.locator('input#task-title').fill(task.title);
      await page.locator('textarea#task-content').fill(task.content);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(500);
    }
    
    // Document full board with tasks
    await page.screenshot({ 
      path: `screenshots/visual-docs/10-full-board-state-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Document task detail view
    await page.locator('div:has-text("User Interface Design")').first().click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: `screenshots/visual-docs/11-task-detail-view-${timestamp}.png`,
      fullPage: true
    });
    
    // Document task editing
    await page.locator('button[aria-label="Edit task"]').click();
    await page.screenshot({ 
      path: `screenshots/visual-docs/12-task-edit-mode-${timestamp}.png`,
      fullPage: true
    });
    
    await page.locator('button:has-text("Cancel")').click();
    
    // Document task deletion confirmation
    await page.locator('button[aria-label="Delete task"]').click();
    await page.screenshot({ 
      path: `screenshots/visual-docs/13-task-delete-confirmation-${timestamp}.png` 
    });
    
    await page.locator('button:has-text("Cancel")').click();
    await page.keyboard.press('Escape'); // Close task detail
    
    // Test and document drag and drop states
    const dragTask = page.locator('div:has-text("API Development")').first();
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');
    
    // Take screenshot before drag
    await page.screenshot({ 
      path: `screenshots/visual-docs/14-before-drag-drop-${timestamp}.png`, 
      fullPage: true 
    });
    
    await dragTask.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);
    
    // Take screenshot after drag
    await page.screenshot({ 
      path: `screenshots/visual-docs/15-after-drag-drop-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Document WIP limit warning (try to add more than 3 to In Progress)
    const anotherTask = page.locator('div:has-text("Database Schema")').first();
    await anotherTask.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: `screenshots/visual-docs/16-wip-limit-reached-${timestamp}.png`, 
      fullPage: true 
    });
  });

  test('Responsive design visual documentation', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create a board with content for responsive testing
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Responsive Test Board');
    await page.locator('textarea#board-goal').fill('Testing responsive design across different screen sizes');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    await page.locator('tr:has-text("Responsive Test Board") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);
    
    // Add some tasks for responsive testing
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    await todoColumn.locator('button[title="Add new task"]').click();
    await page.locator('input#task-title').fill('Responsive Task Example');
    await page.locator('textarea#task-content').fill('This task is used to test responsive design at different breakpoints and screen sizes.');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    // Test different viewport sizes
    const viewports = [
      { name: 'desktop-large', width: 1920, height: 1080 },
      { name: 'desktop-standard', width: 1280, height: 720 },
      { name: 'laptop', width: 1024, height: 768 },
      { name: 'tablet-landscape', width: 1024, height: 768 },
      { name: 'tablet-portrait', width: 768, height: 1024 },
      { name: 'mobile-large', width: 414, height: 896 },
      { name: 'mobile-standard', width: 375, height: 667 },
      { name: 'mobile-small', width: 320, height: 568 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Board list view
      await page.locator('a:has-text("MCP Kanban")').click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/responsive/board-list-${viewport.name}-${viewport.width}x${viewport.height}-${timestamp}.png`, 
        fullPage: true 
      });
      
      // Board detail view
      await page.locator('tr:has-text("Responsive Test Board") a:has-text("View")').first().click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: `screenshots/responsive/board-detail-${viewport.name}-${viewport.width}x${viewport.height}-${timestamp}.png`, 
        fullPage: true 
      });
      
      // Test modal on mobile
      if (viewport.width <= 768) {
        const addButton = page.locator('button[title="Add new task"]').first();
        await addButton.click();
        
        await page.screenshot({ 
          path: `screenshots/responsive/task-modal-${viewport.name}-${viewport.width}x${viewport.height}-${timestamp}.png` 
        });
        
        await page.keyboard.press('Escape');
      }
    }
    
    // Reset to standard viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Dark mode and theme variations', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test different color schemes
    const colorSchemes = ['light', 'dark', 'no-preference'];
    
    for (const scheme of colorSchemes) {
      await page.emulateMedia({ colorScheme: scheme as any });
      await page.waitForTimeout(500);
      
      // Homepage
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: `screenshots/themes/homepage-${scheme}-${timestamp}.png`, 
        fullPage: true 
      });
      
      // Create a board for theme testing if not exists
      if (scheme === 'light') {
        await page.locator('button:has-text("New Board")').click();
        await page.locator('input#board-name').fill('Theme Testing Board');
        await page.locator('textarea#board-goal').fill('Testing different color schemes and themes');
        await page.locator('button:has-text("Create Board")').click();
        await page.waitForTimeout(1000);
        
        // Add sample tasks
        await page.locator('tr:has-text("Theme Testing Board") a:has-text("View")').first().click();
        await page.waitForTimeout(1000);
        
        const columns = ['To Do', 'In Progress', 'Done'];
        for (const column of columns) {
          const columnElement = page.locator(`div:has(h3:has-text("${column}"))`);
          await columnElement.locator('button[title="Add new task"]').click();
          await page.locator('input#task-title').fill(`${column} Task`);
          await page.locator('textarea#task-content').fill(`Sample task for ${column} column theme testing`);
          await page.locator('button:has-text("Create Task")').click();
          await page.waitForTimeout(500);
        }
      }
      
      // Board detail view
      if (await page.locator('tr:has-text("Theme Testing Board")').count() > 0) {
        await page.locator('tr:has-text("Theme Testing Board") a:has-text("View")').first().click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `screenshots/themes/board-detail-${scheme}-${timestamp}.png`, 
          fullPage: true 
        });
        
        // Task detail modal
        if (await page.locator('div:has-text("To Do Task")').count() > 0) {
          await page.locator('div:has-text("To Do Task")').first().click();
          await page.waitForTimeout(500);
          
          await page.screenshot({ 
            path: `screenshots/themes/task-detail-${scheme}-${timestamp}.png` 
          });
          
          await page.keyboard.press('Escape');
        }
        
        await page.locator('a:has-text("MCP Kanban")').click();
        await page.waitForTimeout(500);
      }
    }
    
    // Reset color scheme
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('Accessibility visual states', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test focus states
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Focus on search input
    await page.locator('input[placeholder*="Search boards"]').focus();
    await page.screenshot({ 
      path: `screenshots/accessibility/01-search-input-focus-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Focus on New Board button
    await page.locator('button:has-text("New Board")').focus();
    await page.screenshot({ 
      path: `screenshots/accessibility/02-new-board-button-focus-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.screenshot({ 
      path: `screenshots/accessibility/03-tab-navigation-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Open create board dialog
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: `screenshots/accessibility/04-modal-focus-trap-${timestamp}.png` 
    });
    
    // Test form focus states
    await page.keyboard.press('Tab');
    await page.screenshot({ 
      path: `screenshots/accessibility/05-form-input-focus-${timestamp}.png` 
    });
    
    await page.keyboard.press('Tab');
    await page.screenshot({ 
      path: `screenshots/accessibility/06-textarea-focus-${timestamp}.png` 
    });
    
    await page.keyboard.press('Escape');
    
    // Test high contrast simulation
    await page.emulateMedia({ 
      colorScheme: 'dark',
      reducedMotion: 'reduce' 
    });
    
    await page.screenshot({ 
      path: `screenshots/accessibility/07-high-contrast-simulation-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Reset media settings
    await page.emulateMedia({ 
      colorScheme: 'light',
      reducedMotion: 'no-preference'
    });
  });

  test('Error states visual documentation', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test invalid board navigation
    await page.goto('/boards/invalid-board-id');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: `screenshots/error-states/01-invalid-board-error-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Test empty states
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Create a board for empty state testing
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill('Empty States Test');
    await page.locator('textarea#board-goal').fill('Testing various empty states');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    await page.locator('tr:has-text("Empty States Test") a:has-text("View")').first().click();
    await page.waitForTimeout(1000);
    
    // Empty board state
    await page.screenshot({ 
      path: `screenshots/error-states/02-empty-board-state-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Test form validation states
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    await todoColumn.locator('button[title="Add new task"]').click();
    
    // Empty form state
    await page.screenshot({ 
      path: `screenshots/error-states/03-empty-task-form-${timestamp}.png` 
    });
    
    // Partial form state (should be disabled)
    await page.locator('input#task-title').fill('Partial Task');
    await page.screenshot({ 
      path: `screenshots/error-states/04-partial-task-form-${timestamp}.png` 
    });
    
    await page.keyboard.press('Escape');
    
    // Go back to homepage and test search no results
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(1000);
    
    await page.locator('input[placeholder*="Search boards"]').fill('NonexistentBoard');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: `screenshots/error-states/05-search-no-results-${timestamp}.png`, 
      fullPage: true 
    });
  });

  test('Loading states and transitions', async ({ page }) => {
    const timestamp = Date.now();
    
    // Capture initial loading state
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    await page.screenshot({ 
      path: `screenshots/loading-states/01-initial-load-${timestamp}.png`, 
      fullPage: true 
    });
    
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: `screenshots/loading-states/02-fully-loaded-${timestamp}.png`, 
      fullPage: true 
    });
    
    // Test navigation transitions
    await page.locator('button:has-text("New Board")').click();
    
    await page.screenshot({ 
      path: `screenshots/loading-states/03-modal-transition-${timestamp}.png` 
    });
    
    await page.locator('input#board-name').fill('Transition Test');
    await page.locator('textarea#board-goal').fill('Testing loading transitions');
    await page.locator('button:has-text("Create Board")').click();
    
    // Capture board creation transition
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `screenshots/loading-states/04-board-creation-${timestamp}.png`, 
      fullPage: true 
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/loading-states/05-board-created-final-${timestamp}.png`, 
      fullPage: true 
    });
  });
});