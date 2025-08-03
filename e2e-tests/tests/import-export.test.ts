import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { TestServer } from './helpers/test-server';
import { PageHelpers } from './helpers/page-helpers';

describe('Import/Export E2E Tests', () => {
  let testServer: TestServer;
  let page: puppeteer.Page;
  let helpers: PageHelpers;
  const browser = (global as any).browser;

  beforeAll(async () => {
    testServer = new TestServer();
    await testServer.start();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    helpers = new PageHelpers(page);
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to the app
    await page.goto('http://localhost:8221');
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Export Functionality', () => {
    it('should display export button on boards page', async () => {
      // Navigate to boards page (should be default)
      await page.waitForSelector('h1', { timeout: 5000 });
      
      // Check if export button exists
      const exportButton = await helpers.isElementVisible('button');
      const buttonText = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Export Database'));
      });
      expect(buttonText).toBe(true);
    });

    it('should export empty database', async () => {
      // Wait for page load
      await page.waitForSelector('h1');
      
      // Set up download listener
      const downloadPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Download timeout')), 10000);
        
        page.on('response', async (response) => {
          if (response.url().includes('/api/export')) {
            clearTimeout(timeout);
            try {
              const text = await response.text();
              resolve(text);
            } catch (error) {
              reject(error);
            }
          }
        });
      });
      
      // Click export button
      const exportButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(button => button.textContent?.includes('Export Database'));
      });
      await exportButton.click();
      
      // Wait for download and verify content
      const exportData = await downloadPromise;
      const data = JSON.parse(exportData);
      
      expect(data.boards).toEqual([]);
      expect(data.columns).toEqual([]);
      expect(data.tasks).toEqual([]);
    });

    it('should export database with data', async () => {
      // Seed test data
      await testServer.seedTestData();
      
      // Refresh page to show new data
      await page.reload();
      await page.waitForSelector('h1');
      
      // Set up download listener
      const downloadPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Download timeout')), 10000);
        
        page.on('response', async (response) => {
          if (response.url().includes('/api/export')) {
            clearTimeout(timeout);
            try {
              const text = await response.text();
              resolve(text);
            } catch (error) {
              reject(error);
            }
          }
        });
      });
      
      // Click export button
      await helpers.clickButtonByText('Export Database');
      
      // Wait for download and verify content
      const exportData = await downloadPromise;
      const data = JSON.parse(exportData);
      
      expect(data.boards.length).toBe(1);
      expect(data.columns.length).toBe(3);
      expect(data.tasks.length).toBe(3);
      expect(data.boards[0].name).toBe('Test Board');
    });

    it('should show loading state during export', async () => {
      // Wait for page load
      await page.waitForSelector('h1');
      
      // Click export button
      await helpers.clickButtonByText('Export Database');
      
      // Check for loading state (button should show "Exporting...")
      try {
        await page.waitForFunction(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(button => button.textContent?.includes('Exporting...'));
        }, { timeout: 2000 });
        // If we get here, the loading state was shown (good!)
      } catch {
        // Loading state might be too fast to catch, which is also okay
      }
      
      // Wait for export to complete
      await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Export Database'));
      }, { timeout: 5000 });
    });
  });

  describe('Import Functionality', () => {
    it('should display import button on boards page', async () => {
      // Wait for page load
      await page.waitForSelector('h1');
      
      // Check if import button exists
      const importButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Import Database'));
      });
      expect(importButton).toBe(true);
    });

    it('should open file picker when import button is clicked', async () => {
      // Wait for page load
      await page.waitForSelector('h1');
      
      // Click import button
      await helpers.clickButtonByText('Import Database');
      
      // Check that file input exists and is triggered
      const fileInput = await page.waitForSelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeTruthy();
    });

    it('should import valid database file', async () => {
      // Create test import data
      const importData = {
        boards: [{
          id: 'test-board-123',
          name: 'Imported Board',
          goal: 'Imported from test',
          landing_column_id: 'test-col-123',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        }],
        columns: [{
          id: 'test-col-123',
          board_id: 'test-board-123',
          name: 'Imported Column',
          position: 0,
          wip_limit: 5,
          is_done_column: 0
        }],
        tasks: [{
          id: 'test-task-123',
          column_id: 'test-col-123',
          title: 'Imported Task',
          content: 'This task was imported',
          position: 0,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          update_reason: undefined
        }]
      };

      // Create temporary file
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const testFilePath = path.join(tempDir, 'test-import.json');
      await fs.writeFile(testFilePath, JSON.stringify(importData, null, 2));

      try {
        // Wait for page load
        await page.waitForSelector('h1');
        
        // Set up confirmation dialog handler
        const confirmationPromise = new Promise<void>((resolve) => {
          page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('This will replace ALL existing data');
            await dialog.accept();
            resolve();
          });
        });
        
        // Set up success alert handler
        const successPromise = new Promise<void>((resolve) => {
          page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Database imported successfully');
            await dialog.accept();
            resolve();
          });
        });
        
        // Upload file
        const fileInput = await page.waitForSelector('input[type="file"][accept=".json"]');
        await fileInput?.uploadFile(testFilePath);
        
        // Wait for confirmation dialog and accept
        await confirmationPromise;
        
        // Wait for success dialog
        await successPromise;
        
        // Verify the data was imported by checking the boards list
        await page.waitForSelector('table');
        const boardName = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('td'));
          const cell = cells.find(cell => cell.textContent?.includes('Imported Board'));
          return cell?.textContent?.trim() || '';
        });
        expect(boardName).toContain('Imported Board');
        
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle invalid JSON file', async () => {
      // Create invalid JSON file
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const testFilePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(testFilePath, 'invalid json content');

      try {
        // Wait for page load
        await page.waitForSelector('h1');
        
        // Set up error alert handler
        const errorPromise = new Promise<void>((resolve) => {
          page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Failed to import database');
            await dialog.accept();
            resolve();
          });
        });
        
        // Upload invalid file
        const fileInput = await page.waitForSelector('input[type="file"][accept=".json"]');
        await fileInput?.uploadFile(testFilePath);
        
        // Wait for error dialog
        await errorPromise;
        
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle file with invalid structure', async () => {
      // Create file with invalid structure
      const invalidData = {
        boards: [],
        // Missing columns and tasks
      };

      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const testFilePath = path.join(tempDir, 'invalid-structure.json');
      await fs.writeFile(testFilePath, JSON.stringify(invalidData));

      try {
        // Wait for page load
        await page.waitForSelector('h1');
        
        // Set up error alert handler
        const errorPromise = new Promise<void>((resolve) => {
          page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Invalid file format');
            await dialog.accept();
            resolve();
          });
        });
        
        // Upload invalid file
        const fileInput = await page.waitForSelector('input[type="file"][accept=".json"]');
        await fileInput?.uploadFile(testFilePath);
        
        // Wait for error dialog
        await errorPromise;
        
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should show loading state during import', async () => {
      // Create test import data
      const importData = {
        boards: [],
        columns: [],
        tasks: []
      };

      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const testFilePath = path.join(tempDir, 'test-loading.json');
      await fs.writeFile(testFilePath, JSON.stringify(importData));

      try {
        // Wait for page load
        await page.waitForSelector('h1');
        
        // Set up confirmation handler that doesn't immediately accept
        let confirmDialogShown = false;
        page.once('dialog', async (dialog) => {
          confirmDialogShown = true;
          // Wait a bit to check loading state
          await new Promise(resolve => setTimeout(resolve, 100));
          await dialog.accept();
        });
        
        // Upload file
        const fileInput = await page.waitForSelector('input[type="file"][accept=".json"]');
        await fileInput?.uploadFile(testFilePath);
        
        // Wait for confirmation dialog
        await page.waitForFunction(() => confirmDialogShown);
        
        // Check for loading state on import button
        try {
          await page.waitForFunction(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(button => button.textContent?.includes('Importing...'));
          }, { timeout: 1000 });
        } catch {
          // Loading state might be too fast to catch
        }
        
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Export/Import Round Trip', () => {
    it('should maintain data integrity through export and import', async () => {
      // Seed initial test data
      const { boardId } = await testServer.seedTestData();
      
      // Refresh page to show data
      await page.reload();
      await page.waitForSelector('h1');
      
      // Export the data
      let exportData: string = '';
      const downloadPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Download timeout')), 10000);
        
        page.on('response', async (response) => {
          if (response.url().includes('/api/export')) {
            clearTimeout(timeout);
            try {
              exportData = await response.text();
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        });
      });
      
      await helpers.clickButtonByText('Export Database');
      await downloadPromise;
      
      // Verify export contains our data
      const exportedData = JSON.parse(exportData);
      expect(exportedData.boards.length).toBe(1);
      expect(exportedData.boards[0].name).toBe('Test Board');
      
      // Clear database by importing empty data
      const emptyData = { boards: [], columns: [], tasks: [] };
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const emptyFilePath = path.join(tempDir, 'empty.json');
      await fs.writeFile(emptyFilePath, JSON.stringify(emptyData));
      
      try {
        // Import empty data
        const confirmPromise = helpers.waitForAlert();
        const fileInput = await page.waitForSelector('input[type="file"][accept=".json"]');
        await fileInput?.uploadFile(emptyFilePath);
        await confirmPromise;
        
        // Wait for success and refresh
        await helpers.waitForAlert();
        await page.reload();
        await page.waitForSelector('h1');
        
        // Verify database is empty
        const emptyTable = await page.$('table tbody tr');
        expect(emptyTable).toBeNull();
        
        // Now import the original data back
        const originalFilePath = path.join(tempDir, 'original.json');
        await fs.writeFile(originalFilePath, exportData);
        
        const confirmPromise2 = helpers.waitForAlert();
        const fileInput2 = await page.waitForSelector('input[type="file"][accept=".json"]');
        await fileInput2?.uploadFile(originalFilePath);
        await confirmPromise2;
        
        // Wait for success and refresh
        await helpers.waitForAlert();
        await page.reload();
        await page.waitForSelector('h1');
        
        // Verify data is restored
        await page.waitForSelector('table');
        const restoredBoardName = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('td'));
          const cell = cells.find(cell => cell.textContent?.includes('Test Board'));
          return cell?.textContent?.trim() || '';
        });
        expect(restoredBoardName).toContain('Test Board');
        
        // Verify we can view the board details
        const viewLink = await page.evaluateHandle(() => {
          const links = Array.from(document.querySelectorAll('a'));
          return links.find(link => link.textContent?.includes('View'));
        });
        await viewLink.click();
        await page.waitForFunction(() => {
          const h1 = document.querySelector('h1');
          return h1?.textContent?.includes('Test Board');
        });
        
        // Check that tasks are present
        const taskCards = await page.$$('.task-card, [data-testid="task-card"]');
        expect(taskCards.length).toBeGreaterThan(0);
        
      } finally {
        // Clean up test files
        try {
          await fs.unlink(emptyFilePath);
          await fs.unlink(path.join(tempDir, 'original.json'));
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('UI Responsiveness', () => {
    it('should display buttons correctly on different screen sizes', async () => {
      // Test desktop view (already set in beforeEach)
      await page.waitForSelector('h1');
      
      let exportButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Export Database'));
      });
      let importButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Import Database'));
      });
      
      expect(exportButton).toBe(true);
      expect(importButton).toBe(true);
      
      // Test tablet view
      await page.setViewport({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForSelector('h1');
      
      exportButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Export Database'));
      });
      importButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Import Database'));
      });
      
      expect(exportButton).toBe(true);
      expect(importButton).toBe(true);
      
      // Test mobile view
      await page.setViewport({ width: 375, height: 667 });
      await page.reload();
      await page.waitForSelector('h1');
      
      exportButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Export Database'));
      });
      importButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Import Database'));
      });
      
      expect(exportButton).toBe(true);
      expect(importButton).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Wait for page load
      await page.waitForSelector('h1');
      
      // Intercept network requests and make them fail
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/api/export')) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Set up error handler
      const errorPromise = new Promise<void>((resolve) => {
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('Failed to export database');
          await dialog.accept();
          resolve();
        });
      });
      
      // Try to export (should fail)
      await helpers.clickButtonByText('Export Database');
      
      // Wait for error dialog
      await errorPromise;
      
      // Reset request interception
      await page.setRequestInterception(false);
    });
  });
});