import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Simple Import/Export E2E Tests', () => {
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
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

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

  it('should load the app and show import/export buttons', async () => {
    try {
      // Navigate to the app
      await page.goto('http://localhost:8221', { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Wait for the main header
      await page.waitForSelector('h1', { timeout: 10000 });
      
      // Check that the page title contains "MCP Kanban"
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
      
      // Check for hidden file input
      const fileInputExists = await page.$('input[type="file"][accept=".json"]');
      expect(fileInputExists).toBeTruthy();
      
    } catch (error) {
      console.error('Test failed:', error);
      // Take a screenshot for debugging
      await page.screenshot({ path: './debug-screenshot.png', fullPage: true });
      throw error;
    }
  });

  it('should trigger export when export button is clicked', async () => {
    try {
      await page.goto('http://localhost:8221', { waitUntil: 'networkidle2' });
      await page.waitForSelector('h1');
      
      // Set up response listener for export API
      let exportCalled = false;
      page.on('response', (response) => {
        if (response.url().includes('/api/export')) {
          exportCalled = true;
        }
      });
      
      // Click export button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const exportButton = buttons.find(button => button.textContent?.includes('Export Database'));
        if (exportButton) {
          exportButton.click();
        }
      });
      
      // Wait a bit for the request to be made
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(exportCalled).toBe(true);
      
    } catch (error) {
      console.error('Test failed:', error);
      await page.screenshot({ path: './debug-export.png', fullPage: true });
      throw error;
    }
  });

  it('should show file picker when import button is clicked', async () => {
    try {
      await page.goto('http://localhost:8221', { waitUntil: 'networkidle2' });
      await page.waitForSelector('h1');
      
      // Click import button and check if file input is triggered
      const fileInputTriggered = await page.evaluate(() => {
        return new Promise((resolve) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const importButton = buttons.find(button => button.textContent?.includes('Import Database'));
          const fileInput = document.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
          
          if (importButton && fileInput) {
            // Listen for click on file input
            let clicked = false;
            const originalClick = fileInput.click;
            fileInput.click = function() {
              clicked = true;
              resolve(true);
              return originalClick.call(this);
            };
            
            importButton.click();
            
            // Timeout after 1 second
            setTimeout(() => {
              if (!clicked) {
                resolve(false);
              }
            }, 1000);
          } else {
            resolve(false);
          }
        });
      });
      
      expect(fileInputTriggered).toBe(true);
      
    } catch (error) {
      console.error('Test failed:', error);
      await page.screenshot({ path: './debug-import.png', fullPage: true });
      throw error;
    }
  });

  it('should show buttons on different screen sizes', async () => {
    const screenSizes = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const size of screenSizes) {
      try {
        await page.setViewport({ width: size.width, height: size.height });
        await page.goto('http://localhost:8221', { waitUntil: 'networkidle2' });
        await page.waitForSelector('h1');
        
        // Check buttons exist at this screen size
        const buttonsExist = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const exportExists = buttons.some(button => button.textContent?.includes('Export Database'));
          const importExists = buttons.some(button => button.textContent?.includes('Import Database'));
          return exportExists && importExists;
        });
        
        expect(buttonsExist).toBe(true);
        
      } catch (error) {
        console.error(`Test failed for ${size.name}:`, error);
        await page.screenshot({ path: `./debug-${size.name}.png`, fullPage: true });
        throw error;
      }
    }
  });
});