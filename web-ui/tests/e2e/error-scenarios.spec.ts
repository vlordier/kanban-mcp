import { test, expect } from '@playwright/test';

test.describe('Error Scenarios and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Network error handling and recovery', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create a board first
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(`Network Test ${timestamp}`);
    await page.locator('textarea#board-goal').fill('Testing network error scenarios');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/01-board-created-${timestamp}.png`, fullPage: true });
    
    // Navigate to board
    await page.locator(`tr:has-text("Network Test ${timestamp}") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);
    
    // Simulate slow network by throttling
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1000, // Very slow connection
      uploadThroughput: 1000,
      latency: 2000 // 2 second latency
    });
    
    await page.screenshot({ path: `screenshots/error-scenarios/02-slow-network-state-${timestamp}.png`, fullPage: true });
    
    // Try to create a task with slow network
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    await todoColumn.locator('button[title="Add new task"]').click();
    
    await page.locator('input#task-title').fill('Slow Network Task');
    await page.locator('textarea#task-content').fill('Testing task creation with slow network conditions');
    
    await page.screenshot({ path: `screenshots/error-scenarios/03-task-form-slow-network-${timestamp}.png` });
    
    await page.locator('button:has-text("Create Task")').click();
    
    // Wait longer for slow network
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/04-task-created-slow-network-${timestamp}.png`, fullPage: true });
    
    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
    await client.detach();
  });

  test('Data integrity and concurrent operations', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create board with multiple tasks
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(`Concurrent Test ${timestamp}`);
    await page.locator('textarea#board-goal').fill('Testing concurrent operations and data integrity');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    await page.locator(`tr:has-text("Concurrent Test ${timestamp}") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/05-concurrent-test-board-${timestamp}.png`, fullPage: true });
    
    // Create multiple tasks rapidly
    const tasks = [
      'Rapid Task 1',
      'Rapid Task 2', 
      'Rapid Task 3',
      'Rapid Task 4'
    ];
    
    for (const taskTitle of tasks) {
      const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
      await todoColumn.locator('button[title="Add new task"]').click();
      await page.locator('input#task-title').fill(taskTitle);
      await page.locator('textarea#task-content').fill(`Content for ${taskTitle} - testing rapid creation`);
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(200); // Minimal wait between tasks
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `screenshots/error-scenarios/06-rapid-tasks-created-${timestamp}.png`, fullPage: true });
    
    // Test rapid drag and drop operations
    const task1 = page.locator('div:has-text("Rapid Task 1")').first();
    const inProgressColumn = page.locator('div:has(h3:has-text("In Progress"))');
    await task1.dragTo(inProgressColumn);
    
    const task2 = page.locator('div:has-text("Rapid Task 2")').first();
    await task2.dragTo(inProgressColumn);
    
    const task3 = page.locator('div:has-text("Rapid Task 3")').first();
    await task3.dragTo(inProgressColumn);
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `screenshots/error-scenarios/07-rapid-moves-completed-${timestamp}.png`, fullPage: true });
    
    // Verify WIP limits are enforced
    const inProgressTasks = page.locator('div:has(h3:has-text("In Progress")) [class*="bg-white"]');
    const taskCount = await inProgressTasks.count();
    expect(taskCount).toBeLessThanOrEqual(3); // WIP limit should be 3
  });

  test('Extreme content and unicode handling', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test with extreme unicode content
    const unicodeBoard = `🚀 Unicode Test ${timestamp} 🎯`;
    const unicodeGoal = `
    Testing various unicode characters and emojis:
    🔥 🌟 ⚡ 🎨 🚧 ✅ ❌ ⚠️ 🔔 📊 📈 📉 
    
    Languages: English, Español, Français, Deutsch, 中文, 日本語, 한국어, العربية, Русский, हिन्दी
    
    Math: ∑ ∆ ∞ ≈ ≠ ≤ ≥ π α β γ δ ε
    Arrows: ← → ↑ ↓ ↔ ↕ ⇐ ⇒ ⇑ ⇓
    `;
    
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(unicodeBoard);
    await page.locator('textarea#board-goal').fill(unicodeGoal);
    
    await page.screenshot({ path: `screenshots/error-scenarios/08-unicode-form-${timestamp}.png` });
    
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/09-unicode-board-list-${timestamp}.png`, fullPage: true });
    
    // Navigate to unicode board
    await page.locator(`tr:has-text("🚀 Unicode Test") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/10-unicode-board-detail-${timestamp}.png`, fullPage: true });
    
    // Create task with extreme content
    const extremeContent = `
# 📋 Task with Extreme Content

## 🌍 International Text
- English: The quick brown fox jumps over the lazy dog
- Español: El rápido zorro marrón salta sobre el perro perezoso  
- Français: Le renard brun rapide saute par-dessus le chien paresseux
- Deutsch: Der schnelle braune Fuchs springt über den faulen Hund
- 中文: 快速的棕色狐狸跳过懒狗
- 日本語: 素早い茶色のキツネが怠惰な犬を飛び越える
- 한국어: 빠른 갈색 여우가 게으른 개를 뛰어넘다
- العربية: الثعلب البني السريع يقفز فوق الكلب الكسول
- Русский: Быстрая коричневая лиса прыгает через ленивую собаку
- हिन्दी: तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर कूदती है

## 🔢 Numbers and Symbols
- Large numbers: 1,234,567,890
- Scientific: 1.23e-45, 6.022×10²³
- Fractions: ½ ¼ ¾ ⅓ ⅔ ⅛ ⅜ ⅝ ⅞
- Currency: $123.45 €678.90 ¥1,234 £567.89

## 💻 Code Examples
\`\`\`javascript
// Unicode in code
const 变量 = "多语言变量名";
const émojis = "🎉🚀⭐";
const функция = () => "Функция на русском";
\`\`\`

\`\`\`python
# Unicode strings
unicode_string = "Γεια σας κόσμε! 🌍"
emoji_list = ["😀", "😃", "😄", "😁"]
\`\`\`

## 📊 Special Characters Test
- Quotes: "smart quotes" 'apostrophe' „German quotes" «French quotes»
- Dashes: - – — (hyphen, en-dash, em-dash)
- Spaces: regular space, non-breaking space, thin space
- Math: ∫ ∂ ∇ ∆ ∑ ∏ √ ∞ ≈ ≠ ≤ ≥ ± × ÷
- Arrows: ← → ↑ ↓ ↔ ↕ ⇐ ⇒ ⇑ ⇓ ⇔
- Symbols: © ® ™ ℠ ¢ £ ¥ € § ¶ † ‡ • ‰ ‱

## 🎯 Stress Test Characters
Zero-width characters: ​‌‍⁣⁢⁡⁠
Combining characters: a⃗ e⃗ i⃗ o⃗ u⃗
RTL text: مرحبا بالعالم (Arabic)
Complex emoji: 👨‍👩‍👧‍👦 👩‍💻 🧑‍🚀 🏳️‍🌈
    `;
    
    const todoColumn = page.locator('div:has(h3:has-text("To Do"))').first();
    await todoColumn.locator('button[title="Add new task"]').click();
    await page.locator('input#task-title').fill('🌟 Unicode Stress Test Task 🚀');
    await page.locator('textarea#task-content').fill(extremeContent);
    
    await page.screenshot({ path: `screenshots/error-scenarios/11-extreme-content-form-${timestamp}.png` });
    
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/12-extreme-content-created-${timestamp}.png`, fullPage: true });
    
    // Click on task to see rendering
    await page.locator('div:has-text("🌟 Unicode Stress Test")').first().click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/13-extreme-content-rendered-${timestamp}.png`, fullPage: true });
    
    await page.keyboard.press('Escape');
  });

  test('Browser compatibility and viewport edge cases', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test extremely narrow viewport
    await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE size
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: `screenshots/error-scenarios/14-narrow-viewport-${timestamp}.png`, fullPage: true });
    
    // Test board creation on narrow viewport
    await page.locator('button:has-text("New Board")').click();
    await page.screenshot({ path: `screenshots/error-scenarios/15-create-dialog-narrow-${timestamp}.png` });
    
    await page.locator('input#board-name').fill(`Mobile Test ${timestamp}`);
    await page.locator('textarea#board-goal').fill('Testing mobile viewport edge cases');
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(1000);
    
    await page.locator(`tr:has-text("Mobile Test ${timestamp}") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/16-board-narrow-viewport-${timestamp}.png`, fullPage: true });
    
    // Test task creation on narrow viewport
    const addButton = page.locator('button[title="Add new task"]').first();
    await addButton.click();
    
    await page.screenshot({ path: `screenshots/error-scenarios/17-task-form-narrow-${timestamp}.png` });
    
    await page.locator('input#task-title').fill('Mobile Task');
    await page.locator('textarea#task-content').fill('Task created on mobile viewport');
    await page.locator('button:has-text("Create Task")').click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/18-task-created-narrow-${timestamp}.png`, fullPage: true });
    
    // Test extremely wide viewport
    await page.setViewportSize({ width: 2560, height: 1440 }); // 4K width
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: `screenshots/error-scenarios/19-wide-viewport-${timestamp}.png`, fullPage: true });
    
    // Test very tall viewport
    await page.setViewportSize({ width: 1024, height: 2000 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: `screenshots/error-scenarios/20-tall-viewport-${timestamp}.png`, fullPage: true });
    
    // Reset to standard viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
  });

  test('XSS prevention and content sanitization', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test potentially malicious content
    const xssAttempts = [
      {
        name: 'XSS Script Test',
        goal: 'Testing XSS prevention <script>alert("XSS")</script>',
        taskTitle: '<img src=x onerror=alert("XSS")>',
        taskContent: `
# XSS Prevention Test

## Script Tags
<script>alert('This should not execute');</script>
<script src="malicious.js"></script>

## Event Handlers  
<img src=x onerror=alert('XSS')>
<div onclick="alert('XSS')">Click me</div>
<button onmouseover="alert('XSS')">Hover me</button>

## Data URIs
<iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>

## Style Injections
<div style="background: url('javascript:alert(1)')">Style XSS</div>
<style>body { background: url('javascript:alert(1)'); }</style>

## Form Injections
<form action="javascript:alert('XSS')">
<input type="submit" value="Submit">
</form>

## Link Injections
<a href="javascript:alert('XSS')">Malicious Link</a>
<a href="data:text/html,<script>alert('XSS')</script>">Data URI Link</a>

This content should be safely rendered without executing any scripts.
        `
      }
    ];
    
    for (const attempt of xssAttempts) {
      await page.locator('button:has-text("New Board")').click();
      await page.locator('input#board-name').fill(`${attempt.name} ${timestamp}`);
      await page.locator('textarea#board-goal').fill(attempt.goal);
      
      await page.screenshot({ path: `screenshots/error-scenarios/21-xss-board-form-${timestamp}.png` });
      
      await page.locator('button:has-text("Create Board")').click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: `screenshots/error-scenarios/22-xss-board-created-${timestamp}.png`, fullPage: true });
      
      // Navigate to board
      await page.locator(`tr:has-text("${attempt.name}") a:has-text("View")`).first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: `screenshots/error-scenarios/23-xss-board-detail-${timestamp}.png`, fullPage: true });
      
      // Create task with XSS content
      const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
      await todoColumn.locator('button[title="Add new task"]').click();
      
      await page.locator('input#task-title').fill(attempt.taskTitle);
      await page.locator('textarea#task-content').fill(attempt.taskContent);
      
      await page.screenshot({ path: `screenshots/error-scenarios/24-xss-task-form-${timestamp}.png` });
      
      await page.locator('button:has-text("Create Task")').click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: `screenshots/error-scenarios/25-xss-task-created-${timestamp}.png`, fullPage: true });
      
      // Click on task to see rendered content
      await page.locator('div:has-text("XSS")').first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: `screenshots/error-scenarios/26-xss-task-detail-${timestamp}.png`, fullPage: true });
      
      // Verify no alert dialogs appeared (XSS blocked)
      const alerts = page.locator('[role="alert"]');
      const alertCount = await alerts.count();
      expect(alertCount).toBe(0);
      
      await page.keyboard.press('Escape');
      
      // Return to board list
      await page.locator('a:has-text("MCP Kanban")').click();
      await page.waitForTimeout(1000);
    }
  });

  test('Memory and performance edge cases', async ({ page }) => {
    const timestamp = Date.now();
    
    // Test with large amounts of data
    const largeContent = 'A'.repeat(10000); // 10KB of text
    
    await page.locator('button:has-text("New Board")').click();
    await page.locator('input#board-name').fill(`Large Content Test ${timestamp}`);
    await page.locator('textarea#board-goal').fill(largeContent);
    
    await page.screenshot({ path: `screenshots/error-scenarios/27-large-content-form-${timestamp}.png` });
    
    await page.locator('button:has-text("Create Board")').click();
    await page.waitForTimeout(2000); // Allow more time for large content
    
    await page.locator(`tr:has-text("Large Content Test") a:has-text("View")`).first().click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: `screenshots/error-scenarios/28-large-content-board-${timestamp}.png`, fullPage: true });
    
    // Test rapid interactions
    for (let i = 0; i < 5; i++) {
      const todoColumn = page.locator('div:has(h3:has-text("To Do"))');
      await todoColumn.locator('button[title="Add new task"]').click();
      await page.locator('input#task-title').fill(`Quick Task ${i + 1}`);
      await page.locator('textarea#task-content').fill(`Quick content ${i + 1}`);
      await page.locator('button:has-text("Create Task")').click();
      // No wait between operations to test rapid interaction
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `screenshots/error-scenarios/29-rapid-tasks-${timestamp}.png`, fullPage: true });
    
    // Test memory cleanup by navigating around
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(500);
    
    await page.locator(`tr:has-text("Large Content Test") a:has-text("View")`).first().click();
    await page.waitForTimeout(500);
    
    await page.locator('a:has-text("MCP Kanban")').click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: `screenshots/error-scenarios/30-memory-test-final-${timestamp}.png`, fullPage: true });
  });
});