import { test, expect } from '@playwright/test';

test.describe('Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete project workflow: Create board → Add tasks → Move through workflow → Complete project', async ({
    page,
  }) => {
    const timestamp = Date.now();
    const projectName = `Complete Project ${timestamp}`;

    // Step 1: Create a new project board
    await page.screenshot({
      path: `screenshots/workflows/01-homepage-${timestamp}.png`,
      fullPage: true,
    });

    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({
      path: `screenshots/workflows/02-create-board-dialog-${timestamp}.png`,
    });

    await page.locator('input#board-name').fill(projectName);
    await page
      .locator('textarea#board-goal')
      .fill(
        'Complete end-to-end project workflow test with multiple tasks and full lifecycle management'
      );
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/workflows/03-board-created-${timestamp}.png`,
      fullPage: true,
    });

    // Step 2: Navigate to the board
    await page.locator(`tr:has-text("${projectName}") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/workflows/04-empty-board-${timestamp}.png`,
      fullPage: true,
    });

    // Step 3: Create multiple tasks in different columns
    const tasks = [
      {
        column: 'On Hold',
        title: 'Research Requirements',
        content:
          'Research and document all project requirements\n\n## Subtasks\n- Interview stakeholders\n- Document functional requirements\n- Create technical specifications',
      },
      {
        column: 'To Do',
        title: 'Setup Development Environment',
        content:
          'Configure development environment and tools\n\n**Priority**: High\n\n- Install dependencies\n- Configure IDE\n- Setup version control',
      },
      {
        column: 'To Do',
        title: 'Design Database Schema',
        content:
          'Design and implement database schema\n\n```sql\nCREATE TABLE projects (\n  id UUID PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);\n```',
      },
      {
        column: 'To Do',
        title: 'Create API Endpoints',
        content: 'Implement REST API endpoints for project management',
      },
    ];

    for (const task of tasks) {
      // Find the specific column and click its add button
      // Use the "Add the first task" button for empty columns, or the + button for non-empty ones
      const column = page.locator(`div:has(h3:has-text("${task.column}"))`).first();
      const emptyStateButton = column.locator('button:has-text("Add the first task")');
      const addButton = column.locator('button[title="Add new task"]');

      if ((await emptyStateButton.count()) > 0) {
        await emptyStateButton.click();
      } else {
        await addButton.click();
      }

      await page.locator('input#task-title').fill(task.title);
      await page.locator('textarea#task-content').fill(task.content);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: `screenshots/workflows/05-tasks-created-${timestamp}.png`,
      fullPage: true,
    });

    // Step 4: Move first task from On Hold to To Do
    const onHoldTask = page
      .locator('div:has(h3:has-text("On Hold")) div:has-text("Research Requirements")')
      .first();
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await onHoldTask.dragTo(todoColumn);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/workflows/06-task-moved-to-todo-${timestamp}.png`,
      fullPage: true,
    });

    // Step 5: Move a task to In Progress
    const todoTask = page
      .locator('div:has(h3:has-text("To Do")) div:has-text("Setup Development Environment")')
      .first();
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');
    await todoTask.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/workflows/07-task-in-progress-${timestamp}.png`,
      fullPage: true,
    });

    // Step 6: Edit a task to add progress updates
    await page.locator('div:has-text("Setup Development Environment")').first().click();
    await page.screenshot({ path: `screenshots/workflows/08-task-detail-view-${timestamp}.png` });

    await page.locator('button[aria-label="Edit task"]').click();
    const editTextarea = page.locator('textarea[class*="font-mono"]');
    const updatedContent = `Configure development environment and tools

**Priority**: High
**Status**: In Progress ✅

## Completed
- [x] Install dependencies
- [x] Configure IDE
- [x] Setup version control

## Next Steps
- [ ] Configure deployment pipeline
- [ ] Setup testing framework`;

    await editTextarea.fill(updatedContent);
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: `screenshots/workflows/09-task-updated-${timestamp}.png` });

    // Close task detail
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Step 7: Complete a task by moving to Done
    const inProgressTask = page
      .locator('div:has(h3:has-text("In Progress")) div:has-text("Setup Development Environment")')
      .first();
    const doneColumn = page.locator('div:has(h3:has-text("Done"))');
    await inProgressTask.dragTo(doneColumn);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/workflows/10-task-completed-${timestamp}.png`,
      fullPage: true,
    });

    // Step 8: Create additional tasks to show full board capacity
    const additionalTasks = [
      { title: 'Write Unit Tests', content: 'Create comprehensive unit test suite' },
      { title: 'Setup CI/CD Pipeline', content: 'Configure continuous integration and deployment' },
    ];

    for (const task of additionalTasks) {
      const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
      const emptyStateButton = todoColumn.locator('button:has-text("Add the first task")');
      const addButton = todoColumn.locator('button[title="Add new task"]');

      if ((await emptyStateButton.count()) > 0) {
        await emptyStateButton.click();
      } else {
        await addButton.click();
      }
      await page.locator('input#task-title').fill(task.title);
      await page.locator('textarea#task-content').fill(task.content);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: `screenshots/workflows/11-full-board-state-${timestamp}.png`,
      fullPage: true,
    });

    // Step 9: Test WIP limits by moving tasks to In Progress
    const tasks_to_move = page.locator('div:has(h3:has-text("To Do")) [class*="bg-white"]').first();
    await tasks_to_move.dragTo(inProgressColumn);
    await page.waitForTimeout(500);

    // Try to add one more to test WIP limit
    const another_task = page.locator('div:has(h3:has-text("To Do")) [class*="bg-white"]').first();
    await another_task.dragTo(inProgressColumn);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `screenshots/workflows/12-wip-limits-tested-${timestamp}.png`,
      fullPage: true,
    });

    // Step 10: Return to board list and verify project shows up
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/workflows/13-back-to-board-list-${timestamp}.png`,
      fullPage: true,
    });

    // Verify the board exists and has the correct information
    await expect(page.locator(`td:has-text("${projectName}")`)).toBeVisible();
    await expect(page.locator('text=Complete end-to-end project workflow')).toBeVisible();
  });

  test('Team collaboration workflow: Multiple boards → Task assignment → Status tracking', async ({
    page,
  }) => {
    const timestamp = Date.now();

    // Create multiple boards for different projects
    const projects = [
      {
        name: `Frontend Development ${timestamp}`,
        goal: 'Build user interface components and pages',
      },
      { name: `Backend API ${timestamp}`, goal: 'Develop REST API and database integration' },
      {
        name: `DevOps Pipeline ${timestamp}`,
        goal: 'Setup deployment and monitoring infrastructure',
      },
    ];

    await page.screenshot({
      path: `screenshots/collaboration/01-start-state-${timestamp}.png`,
      fullPage: true,
    });

    // Create all boards
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      await page.locator('button:has-text("New Board")').click();
      await page.locator('input#board-name').fill(project.name);
      await page.locator('textarea#board-goal').fill(project.goal);
      await page.locator('button:has-text("Create Board")').click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `screenshots/collaboration/02-${i + 1}-board-created-${timestamp}.png`,
        fullPage: true,
      });
    }

    // Test search functionality across projects
    await page.locator('input[placeholder*="Search boards"]').fill('Frontend');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `screenshots/collaboration/03-search-filtering-${timestamp}.png`,
      fullPage: true,
    });

    // Clear search
    await page.locator('button:has-text("Clear")').click();
    await page.waitForTimeout(500);

    // Work with Frontend Development board
    await page
      .locator(`tr:has-text("Frontend Development ${timestamp}") a:has-text("View")`)
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Add frontend-specific tasks
    const frontendTasks = [
      {
        column: 'To Do',
        title: 'Component Library Setup',
        content:
          '# Component Library\n\nSetup base component library with:\n- Button components\n- Form elements\n- Layout components\n\n**Assigned to**: Frontend Team Lead',
      },
      {
        column: 'To Do',
        title: 'Dashboard Implementation',
        content:
          '## Dashboard Features\n\n- [ ] Charts and graphs\n- [ ] Data tables\n- [ ] Filter controls\n- [ ] Export functionality\n\n**Priority**: High\n**Deadline**: End of sprint',
      },
      {
        column: 'In Progress',
        title: 'User Authentication UI',
        content:
          'Implement login/register forms\n\n**Status**: 60% complete\n- [x] Login form\n- [x] Registration form\n- [ ] Password reset\n- [ ] Email verification',
      },
    ];

    for (const task of frontendTasks) {
      const column = page.locator(`div:has(h3:has-text("${task.column}"))`).first();
      const emptyStateButton = column.locator('button:has-text("Add the first task")');
      const addButton = column.locator('button[title="Add new task"]');

      if ((await emptyStateButton.count()) > 0) {
        await emptyStateButton.click();
      } else {
        await addButton.click();
      }
      await page.locator('input#task-title').fill(task.title);
      await page.locator('textarea#task-content').fill(task.content);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: `screenshots/collaboration/04-frontend-tasks-${timestamp}.png`,
      fullPage: true,
    });

    // Navigate back and go to Backend API board
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(1000);

    await page
      .locator(`tr:has-text("Backend API ${timestamp}") a:has-text("View")`)
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Add backend-specific tasks
    const backendTasks = [
      {
        column: 'To Do',
        title: 'Database Schema Design',
        content:
          '# Database Design\n\n## Tables Required:\n- users\n- projects\n- tasks\n- comments\n\n**Dependencies**: Requirements analysis complete',
      },
      {
        column: 'In Progress',
        title: 'User Authentication API',
        content:
          '## Authentication Endpoints\n\n- [x] POST /auth/login\n- [x] POST /auth/register\n- [ ] POST /auth/refresh\n- [ ] POST /auth/logout\n\n**Blocked by**: Redis setup for sessions',
      },
      {
        column: 'Done',
        title: 'Project Setup',
        content:
          'Initial project structure and dependencies\n\n✅ **Completed**\n- Express.js server\n- TypeScript configuration\n- Database connection\n- Basic middleware',
      },
    ];

    for (const task of backendTasks) {
      const column = page.locator(`div:has(h3:has-text("${task.column}"))`).first();
      await column.locator('button[title="Add new task"]').click();
      await page.locator('input#task-title').fill(task.title);
      await page.locator('textarea#task-content').fill(task.content);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: `screenshots/collaboration/05-backend-tasks-${timestamp}.png`,
      fullPage: true,
    });

    // Test cross-project coordination by going back to overview
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/collaboration/06-project-overview-${timestamp}.png`,
      fullPage: true,
    });

    // Verify all projects are visible with their goals
    for (const project of projects) {
      await expect(page.locator(`td:has-text("${project.name}")`)).toBeVisible();
    }
  });

  test('Error handling and edge cases workflow', async ({ page }) => {
    const timestamp = Date.now();

    await page.screenshot({
      path: `screenshots/error-handling/01-initial-state-${timestamp}.png`,
      fullPage: true,
    });

    // Test validation errors
    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({ path: `screenshots/error-handling/02-empty-form-${timestamp}.png` });

    // Try to submit empty form (button should be disabled)
    const createButton = page.locator('button:has-text("Create Board")');
    await expect(createButton).toBeDisabled();

    // Fill only name (should still be disabled)
    await page.locator('input#board-name').fill('Test Board');
    await expect(createButton).toBeDisabled();
    await page.screenshot({ path: `screenshots/error-handling/03-partial-form-${timestamp}.png` });

    // Cancel dialog
    await page.locator('button:has-text("Cancel")').click();

    // Test very long board names and descriptions
    const longName = 'A'.repeat(100);
    const longGoal = 'B'.repeat(500);

    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(longName);
    await page.locator('textarea#board-goal').fill(longGoal);
    await page.screenshot({ path: `screenshots/error-handling/04-long-content-${timestamp}.png` });

    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    // Navigate to the board
    await page
      .locator(`tr:has-text("${'A'.repeat(20)}") a:has-text("View")`)
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/error-handling/05-long-content-board-${timestamp}.png`,
      fullPage: true,
    });

    // Test task creation with edge cases
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    const emptyStateButton = todoColumn.locator('button:has-text("Add the first task")');
    const addButton = todoColumn.locator('button[title="Add new task"]');

    if ((await emptyStateButton.count()) > 0) {
      await emptyStateButton.click();
    } else {
      await addButton.click();
    }

    // Try to create task with only title (should be disabled)
    await page.locator('input#task-title').fill('Test Task');
    const createTaskButton = page.locator('button:has-text("Create Task")');
    await expect(createTaskButton).toBeDisabled();

    await page.screenshot({
      path: `screenshots/error-handling/06-incomplete-task-form-${timestamp}.png`,
    });

    // Add content with special characters and formatting
    const specialContent = `# Task with Special Characters

    **Testing**: åäö, émotions, 中文, العربية, русский

    ## Code Block
    \`\`\`javascript
    function test() {
      return "Hello < > & ' " + '"' + " World!";
    }
    \`\`\`

    ## Links and Markdown
    [Link](https://example.com)
    - Item 1
    - Item 2
      - Nested item

    > Blockquote with **bold** and *italic*

    ---

    | Column 1 | Column 2 |
    |----------|----------|
    | Cell 1   | Cell 2   |`;

    await page.locator('textarea#task-content').fill(specialContent);
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/error-handling/07-special-characters-task-${timestamp}.png`,
      fullPage: true,
    });

    // Click on the task to see how special content renders
    await page.locator('div:has-text("Test Task")').first().click();
    await page.screenshot({
      path: `screenshots/error-handling/08-special-content-rendered-${timestamp}.png`,
    });

    // Test editing with more content
    await page.locator('button[aria-label="Edit task"]').click();
    await page.screenshot({
      path: `screenshots/error-handling/09-edit-mode-special-content-${timestamp}.png`,
    });

    // Close without saving
    await page.locator('button:has-text("Cancel")').click();
    await page.keyboard.press('Escape'); // Close task detail

    // Test invalid navigation
    await page.goto('/boards/invalid-board-id');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `screenshots/error-handling/10-invalid-board-error-${timestamp}.png`,
      fullPage: true,
    });

    // Should show error message and link back
    await expect(page.locator('text=Error loading board')).toBeVisible();
    await page.locator('a:has-text("Go back to boards list")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/error-handling/11-back-from-error-${timestamp}.png`,
      fullPage: true,
    });

    // Should be back at board list
    await expect(page.locator('h1:has-text("Kanban Boards")')).toBeVisible();
  });

  test('Performance and stress testing workflow', async ({ page }) => {
    const timestamp = Date.now();

    // Create a board for stress testing
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(`Stress Test Board ${timestamp}`);
    await page.locator('textarea#board-goal').fill('Board for testing performance with many tasks');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);

    await page
      .locator(`tr:has-text("Stress Test Board ${timestamp}") a:has-text("View")`)
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/stress-test/01-empty-stress-board-${timestamp}.png`,
      fullPage: true,
    });

    // Create many tasks quickly
    const taskCount = 15; // Reasonable number for E2E testing
    for (let i = 1; i <= taskCount; i++) {
      const column =
        i % 4 === 0 ? 'Done' : i % 3 === 0 ? 'In Progress' : i % 2 === 0 ? 'On Hold' : 'To Do';
      // Use more specific selectors to avoid strict mode violations
      if (column === 'To Do') {
        const emptyButton = page.locator(
          'div:has(h3:has-text("To Do") + span:has-text("0")) button:has-text("Add the first task")'
        );
        const addButton = page.locator(
          'div:has(h3:has-text("To Do") + span:has-text("0")) button[title="Add new task"]'
        );

        if ((await emptyButton.count()) > 0) {
          await emptyButton.first().click();
        } else {
          await addButton.first().click();
        }
      } else {
        // For other columns, use the empty state button first or the add button
        const emptyButton = page.locator(
          `div:has(h3:has-text("${column}")) button:has-text("Add the first task")`
        );
        const addButton = page.locator(
          `div:has(h3:has-text("${column}")) button[title="Add new task"]`
        );

        if ((await emptyButton.count()) > 0) {
          await emptyButton.first().click();
        } else {
          await addButton.first().click();
        }
      }
      await page.locator('input#task-title').fill(`Task ${i.toString().padStart(2, '0')}`);
      await page
        .locator('textarea#task-content')
        .fill(
          `This is task number ${i} for stress testing the UI.\n\nContent includes:\n- Task ID: ${i}\n- Created at: ${new Date().toISOString()}\n- Column: ${column}`
        );
      await page.locator('button:has-text("Create Task")').click();

      // Take screenshots at intervals
      if (i % 5 === 0) {
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `screenshots/stress-test/02-${i}-tasks-created-${timestamp}.png`,
          fullPage: true,
        });
      }
    }

    // Test scrolling and interaction with many tasks
    await page.screenshot({
      path: `screenshots/stress-test/03-many-tasks-final-${timestamp}.png`,
      fullPage: true,
    });

    // Test dragging tasks between columns with many tasks
    const firstTask = page.locator('div:has(h3:has-text("To Do")) [class*="bg-white"]').first();
    const doneColumn = page.locator('div:has(h3:has-text("Done"))');
    await firstTask.dragTo(doneColumn);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/stress-test/04-drag-with-many-tasks-${timestamp}.png`,
      fullPage: true,
    });

    // Test task detail performance
    await page.locator('div:has-text("Task 01")').first().click();
    await page.screenshot({
      path: `screenshots/stress-test/05-task-detail-performance-${timestamp}.png`,
    });

    await page.keyboard.press('Escape');

    // Return to board list and verify performance
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `screenshots/stress-test/06-board-list-after-stress-${timestamp}.png`,
      fullPage: true,
    });
  });
});
