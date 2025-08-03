import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { waitForServer } from './helpers/server-health';

describe('Basic UI Tests', () => {
  let browser: Browser;
  let page: Page;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Launch browser
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Start web server
    const serverPath = path.join(__dirname, '../../web-server/dist/index.js');
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        MCP_KANBAN_DB_FOLDER_PATH: path.join(__dirname, '../temp')
      },
      stdio: 'ignore'
    });

    // Wait for server to be ready with health check
    await waitForServer({ port: 8221, timeout: 15000 });
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  it('should load the app and display import/export buttons', async () => {
    try {
      // Navigate to the app
      await page.goto('http://localhost:8221', { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });
      
      // Wait for the main header
      await page.waitForSelector('h1', { timeout: 10000 });
      
      // Check that the page loaded correctly
      const title = await page.$eval('h1', el => el.textContent);
      expect(title).toContain('MCP Kanban');
      
      // Check for export button
      const exportButtonExists = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Export Database'));
      });
      expect(exportButtonExists).toBe(true);
      
      // Check for import button
      const importButtonExists = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Import Database'));
      });
      expect(importButtonExists).toBe(true);
      
      console.log('✅ Import/Export buttons are present and functional');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      
      // Take a screenshot for debugging
      try {
        await page.screenshot({ 
          path: path.join(__dirname, '../screenshots/debug-ui-test.png'), 
          fullPage: true 
        });
        console.log('📸 Debug screenshot saved');
      } catch (screenshotError) {
        console.error('Failed to take screenshot:', screenshotError);
      }
      
      throw error;
    }
  });

  it('should have functional export button that makes API call', async () => {
    try {
      await page.goto('http://localhost:8221', { waitUntil: 'networkidle2' });
      await page.waitForSelector('h1');
      
      // Set up response listener for export API
      let exportApiCalled = false;
      let exportResponse: any = null;
      
      page.on('response', async (response) => {
        if (response.url().includes('/api/export')) {
          exportApiCalled = true;
          try {
            exportResponse = await response.json();
          } catch {
            // Response might not be JSON in case of error
            exportResponse = { error: 'Failed to parse response' };
          }
        }
      });
      
      // Click export button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const exportButton = buttons.find(button => button.textContent?.includes('Export Database'));
        if (exportButton) {
          (exportButton as HTMLButtonElement).click();
        } else {
          throw new Error('Export button not found');
        }
      });
      
      // Wait for the API call to complete
      await page.waitForFunction(() => window.exportApiCalled === true, { timeout: 5000 });
      
      expect(exportApiCalled).toBe(true);
      expect(exportResponse).toBeTruthy();
      
      // Check that response has the expected structure
      if (exportResponse && !exportResponse.error) {
        expect(exportResponse).toHaveProperty('boards');
        expect(exportResponse).toHaveProperty('columns');
        expect(exportResponse).toHaveProperty('tasks');
      }
      
      console.log('✅ Export functionality works correctly');
      
    } catch (error) {
      console.error('❌ Export test failed:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '../screenshots/debug-export-test.png'), 
        fullPage: true 
      });
      throw error;
    }
  });
});