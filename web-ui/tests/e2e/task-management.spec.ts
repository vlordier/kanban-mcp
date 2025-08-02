import { test, expect } from '@playwright/test';

test.describe('Task Management UX', () => {
  let uniqueBoardName: string;
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Create a test board for task operations with unique name
    uniqueBoardName = `Task Test Board ${Date.now()}`;
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(uniqueBoardName);
    await page.locator('textarea#board-goal').fill('Board for testing task operations');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    // Navigate to the board
    await page.locator(`tr:has-text("${uniqueBoardName}") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);
  });

  test('should display board with empty columns and create task buttons', async ({ page }) => {
    // Check board title and goal
    await expect(page.locator(`h2:has-text("${uniqueBoardName}")`)).toBeVisible();
    await expect(page.locator('text=Board for testing task operations')).toBeVisible();
    
    // Check all columns are visible
    await expect(page.locator('text=On Hold')).toBeVisible();
    await expect(page.locator('text=To Do')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Done')).toBeVisible();
    
    // Check empty state messages
    await expect(page.locator('text=No tasks yet')).toHaveCount(4);
    
    // Check create task buttons (+ icons) in column headers
    const plusButtons = page.locator('button[title="Add new task"]');
    await expect(plusButtons).toHaveCount(4);
  });

  test('should open task creation dialog from column header', async ({ page }) => {
    // Click the + button in the "To Do" column
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    const plusButton = todoColumn.locator('button[title="Add new task"]');
    await plusButton.click();
    
    // Check task creation dialog
    await expect(page.locator('text=Create New Task')).toBeVisible();
    await expect(page.locator('text=Adding to: To Do')).toBeVisible();
    
    // Check form fields
    await expect(page.locator('input#task-title')).toBeVisible();
    await expect(page.locator('textarea#task-content')).toBeVisible();
    
    // Check markdown hint
    await expect(page.locator('text=Supports Markdown formatting')).toBeVisible();
    
    // Check buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Task")')).toBeVisible();
  });

  test('should validate task creation form', async ({ page }) => {
    // Open create task dialog
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button[title="Add new task"]').click();
    
    // Create button should be disabled initially
    const createButton = page.locator('button:has-text("Create Task")');
    await expect(createButton).toBeDisabled();
    
    // Fill only title
    await page.locator('input#task-title').fill('Test Task');
    await expect(createButton).toBeDisabled();
    
    // Fill both fields
    await page.locator('textarea#task-content').fill('Task description with **markdown** support');
    await expect(createButton).toBeEnabled();
  });

  test('should create task successfully and display in column', async ({ page }) => {
    // Create a task in To Do column
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button[title="Add new task"]').click();
    
    await page.locator('input#task-title').fill('E2E Test Task');
    await page.locator('textarea#task-content').fill('This is a test task created via E2E testing\n\n## Acceptance Criteria\n- Task should appear in To Do column\n- Task should be clickable');
    
    await page.locator('button:has-text("Create Task")').click();
    
    // Wait for task to appear
    await page.waitForTimeout(1000);
    
    // Check task appears in To Do column
    await expect(page.locator('text=E2E Test Task')).toBeVisible();
    
    // Check task count updated
    await expect(page.locator('div:has(h3:has-text("To Do")) span:has-text("1")')).toBeVisible();
    
    // Check empty state is gone
    const todoColumnContent = page.locator('div:has(h3:has-text("To Do"))');
    await expect(todoColumnContent.locator('text=No tasks yet')).not.toBeVisible();
  });

  test('should open task detail when clicking task', async ({ page }) => {
    // First create a task
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button[title="Add new task"]').click();
    await page.locator('input#task-title').fill('Clickable Task');
    await page.locator('textarea#task-content').fill('Task content to test detail view');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    // Click on the task
    await page.locator('text=Clickable Task').click();
    
    // Check task detail dialog opens
    await expect(page.locator('h3:has-text("Clickable Task")')).toBeVisible();
    await expect(page.locator('text=Task content to test detail view')).toBeVisible();
    
    // Check task details section
    await expect(page.locator('text=Details')).toBeVisible();
    await expect(page.locator('text=Created')).toBeVisible();
    await expect(page.locator('text=Updated')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('button[aria-label="Edit task"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Delete task"]')).toBeVisible();
  });

  test('should edit task content', async ({ page }) => {
    // Create a task first
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button[title="Add new task"]').click();
    await page.locator('input#task-title').fill('Editable Task');
    await page.locator('textarea#task-content').fill('Original content');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    // Open task detail
    await page.locator('text=Editable Task').click();
    
    // Click edit button
    await page.locator('button[aria-label="Edit task"]').click();
    
    // Check edit mode
    const editTextarea = page.locator('textarea[class*="font-mono"]');
    await expect(editTextarea).toBeVisible();
    await expect(editTextarea).toHaveValue('Original content');
    
    // Edit content
    await editTextarea.fill('Updated content with **markdown**');
    
    // Save changes
    await page.locator('button:has-text("Save")').click();
    
    // Check content updated
    await expect(page.locator('text=Updated content with')).toBeVisible();
  });

  test('should delete task with confirmation', async ({ page }) => {
    // Create a task first
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button[title="Add new task"]').click();
    await page.locator('input#task-title').fill('Task to Delete');
    await page.locator('textarea#task-content').fill('This task will be deleted');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    // Open task detail
    await page.locator('text=Task to Delete').click();
    
    // Click delete button
    await page.locator('button[aria-label="Delete task"]').click();
    
    // Check confirmation dialog
    await expect(page.locator('text=Delete Task')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete "Task to Delete"')).toBeVisible();
    
    // Confirm deletion
    await page.locator('button:has-text("Delete"):not(:has-text("Cancel"))').click();
    
    // Check task is removed and we're back to board view
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Task to Delete')).not.toBeVisible();
    
    // Check empty state is back
    const todoColumnContent = page.locator('div:has(h3:has-text("To Do"))');
    await expect(todoColumnContent.locator('text=No tasks yet')).toBeVisible();
  });

  test('should create task from empty state link', async ({ page }) => {
    // Click "Add the first task" link in empty To Do column
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button:has-text("Add the first task")').click();
    
    // Should open create dialog
    await expect(page.locator('text=Create New Task')).toBeVisible();
    await expect(page.locator('text=Adding to: To Do')).toBeVisible();
  });

  test('should show WIP limits and capacity indicators', async ({ page }) => {
    // Check In Progress column shows WIP limit (should be 3 by default)
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');
    await expect(inProgressColumn.locator('span:has-text("0 / 3")')).toBeVisible();
    
    // Check unlimited columns don't show limit
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await expect(todoColumn.locator('span:has-text("0")')).toBeVisible();
    await expect(todoColumn.locator('span:has-text("/")')).not.toBeVisible();
  });

  test('should show landing column indicator', async ({ page }) => {
    // To Do should be marked as landing column
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await expect(todoColumn.locator('span:has-text("Landing")')).toBeVisible();
  });

  test('should support drag and drop between columns', async ({ page }) => {
    // First create a task in To Do
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
    await todoColumn.locator('button[title="Add new task"]').click();
    await page.locator('input#task-title').fill('Draggable Task');
    await page.locator('textarea#task-content').fill('Task for drag and drop testing');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    // Find the task card and In Progress column
    const taskCard = page.locator('div:has-text("Draggable Task")').first();
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');
    
    // Perform drag and drop
    await taskCard.dragTo(inProgressColumn);
    await page.waitForTimeout(1000);
    
    // Check task moved to In Progress
    const inProgressContent = page.locator('div:has(h3:has-text("In Progress"))');
    await expect(inProgressContent.locator('text=Draggable Task')).toBeVisible();
    
    // Check task counts updated
    await expect(page.locator('div:has(h3:has-text("To Do")) span:has-text("0")')).toBeVisible();
    await expect(page.locator('div:has(h3:has-text("In Progress")) span:has-text("1 / 3")')).toBeVisible();
  });
});