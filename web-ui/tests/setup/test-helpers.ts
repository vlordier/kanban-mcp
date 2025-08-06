import { Page } from '@playwright/test';
import { MockApiServer } from './mock-api';

export async function setupMockApi(page: Page): Promise<MockApiServer> {
  const mockServer = new MockApiServer();
  await mockServer.setupRoutes(page);
  return mockServer;
}

export async function waitForPageLoad(page: Page) {
  // Wait for the main heading to be visible
  await page.waitForSelector('h1:has-text("Kanban Boards")', { timeout: 10000 });
  
  // Wait for any loading states to complete
  await page.waitForLoadState('networkidle');
}

export async function createBoard(page: Page, name: string, goal: string = '') {
  await page.click('button:has-text("New Board")');
  await page.fill('input#board-name', name);
  if (goal) {
    await page.fill('textarea#board-goal', goal);
  }
  await page.click('button:has-text("Create Board")');
  
  // Wait for the board to appear
  await page.waitForSelector(`text=${name}`, { timeout: 5000 });
}