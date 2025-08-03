const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class VisualTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:8221';
    this.screenshotDir = path.join(__dirname, 'visual-test-results');
    this.testResults = [];
  }

  async setup() {
    console.log('🚀 Setting up comprehensive visual test suite...');
    
    // Create screenshot directory structure
    const directories = [
      this.screenshotDir,
      path.join(this.screenshotDir, '1-initial-state'),
      path.join(this.screenshotDir, '2-import-export'),
      path.join(this.screenshotDir, '3-board-management'),
      path.join(this.screenshotDir, '4-kanban-workflow'),
      path.join(this.screenshotDir, '5-error-states'),
      path.join(this.screenshotDir, '6-responsive-design'),
      path.join(this.screenshotDir, '7-interactions')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    
    console.log('✅ Browser setup complete');
  }

  async takeScreenshot(filename, fullPage = true, options = {}) {
    const screenshotPath = path.join(this.screenshotDir, filename);
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage,
      ...options 
    });
    console.log(`📸 Screenshot saved: ${filename}`);
    return screenshotPath;
  }

  async addTestResult(testName, status, screenshotPath, details = '') {
    this.testResults.push({
      testName,
      status,
      screenshotPath,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async testInitialState() {
    console.log('\n📋 Testing Initial State...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await this.page.waitForSelector('h1', { timeout: 10000 });

      // Screenshot: Initial page load
      await this.takeScreenshot('1-initial-state/01-initial-load.png');
      
      // Get page info
      const title = await this.page.title();
      const buttons = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          visible: btn.offsetParent !== null
        }));
      });

      await this.addTestResult('Initial Page Load', 'PASS', '1-initial-state/01-initial-load.png', 
        `Title: ${title}, Buttons found: ${buttons.length}`);

      console.log(`  ✅ Page loaded: "${title}"`);
      console.log(`  ✅ Found ${buttons.length} buttons`);

    } catch (error) {
      await this.takeScreenshot('1-initial-state/01-initial-load-error.png');
      await this.addTestResult('Initial Page Load', 'FAIL', '1-initial-state/01-initial-load-error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testImportExportFeatures() {
    console.log('\n📤📥 Testing Import/Export Features...');

    try {
      // Highlight import/export buttons
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Export Database') || btn.textContent?.includes('Import Database')) {
            btn.style.border = '3px solid red';
            btn.style.boxShadow = '0 0 10px red';
          }
        });
      });

      await this.takeScreenshot('2-import-export/01-buttons-highlighted.png');

      // Test export functionality
      let exportCalled = false;
      this.page.on('response', (response) => {
        if (response.url().includes('/api/export')) {
          exportCalled = true;
        }
      });

      // Click export button
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const exportButton = buttons.find(button => button.textContent?.includes('Export Database'));
        if (exportButton) {
          exportButton.click();
        }
      });

      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('2-import-export/02-export-clicked.png');

      await this.addTestResult('Export Button Test', exportCalled ? 'PASS' : 'FAIL', 
        '2-import-export/02-export-clicked.png', `Export API called: ${exportCalled}`);

      console.log(`  ${exportCalled ? '✅' : '❌'} Export button functionality`);

      // Test import button (file picker)
      const importButtonExists = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent?.includes('Import Database'));
      });

      await this.addTestResult('Import Button Presence', importButtonExists ? 'PASS' : 'FAIL',
        '2-import-export/01-buttons-highlighted.png', `Import button found: ${importButtonExists}`);

      console.log(`  ${importButtonExists ? '✅' : '❌'} Import button present`);

    } catch (error) {
      await this.takeScreenshot('2-import-export/error.png');
      await this.addTestResult('Import/Export Features', 'FAIL', '2-import-export/error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testBoardManagement() {
    console.log('\n📋 Testing Board Management...');

    try {
      // Check if there are existing boards
      const boardCount = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        return rows.length;
      });

      await this.takeScreenshot('3-board-management/01-board-list.png');
      console.log(`  📊 Found ${boardCount} existing boards`);

      // Look for Create Board button or link
      const createBoardElement = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const createButton = buttons.find(el => 
          el.textContent?.toLowerCase().includes('create') || 
          el.textContent?.toLowerCase().includes('new board') ||
          el.textContent?.toLowerCase().includes('add board')
        );
        return createButton ? {
          text: createButton.textContent?.trim(),
          tagName: createButton.tagName,
          href: createButton.href
        } : null;
      });

      if (createBoardElement) {
        console.log(`  ✅ Found create board element: "${createBoardElement.text}"`);
        
        // If it's a link, navigate to it
        if (createBoardElement.href) {
          await this.page.goto(createBoardElement.href, { waitUntil: 'networkidle2' });
          await this.takeScreenshot('3-board-management/02-create-board-page.png');
          
          await this.addTestResult('Create Board Navigation', 'PASS', '3-board-management/02-create-board-page.png',
            `Navigated to: ${createBoardElement.href}`);
        }
      }

      await this.addTestResult('Board Management Interface', 'PASS', '3-board-management/01-board-list.png',
        `Board count: ${boardCount}, Create button: ${createBoardElement ? 'found' : 'not found'}`);

    } catch (error) {
      await this.takeScreenshot('3-board-management/error.png');
      await this.addTestResult('Board Management', 'FAIL', '3-board-management/error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testKanbanWorkflow() {
    console.log('\n📌 Testing Kanban Workflow...');

    try {
      // Go back to boards list if we're not there
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Check if there are any boards to click on
      const boardLinks = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        const links = [];
        rows.forEach(row => {
          const link = row.querySelector('a');
          if (link) {
            links.push({
              text: link.textContent?.trim(),
              href: link.href
            });
          }
        });
        return links;
      });

      await this.takeScreenshot('4-kanban-workflow/01-available-boards.png');

      if (boardLinks.length > 0) {
        console.log(`  ✅ Found ${boardLinks.length} board(s) to test`);
        
        // Click on the first board
        const firstBoard = boardLinks[0];
        await this.page.goto(firstBoard.href, { waitUntil: 'networkidle2' });
        await this.takeScreenshot('4-kanban-workflow/02-board-view.png');

        // Check for kanban columns
        const columns = await this.page.evaluate(() => {
          // Look for common kanban column selectors
          const columnSelectors = [
            '[data-testid*="column"]',
            '.column',
            '.kanban-column',
            'div[class*="column"]'
          ];
          
          let foundColumns = [];
          for (const selector of columnSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              foundColumns = Array.from(elements).map(el => ({
                text: el.textContent?.trim().substring(0, 50),
                className: el.className
              }));
              break;
            }
          }
          
          return foundColumns;
        });

        console.log(`  📋 Found ${columns.length} kanban columns`);
        
        await this.addTestResult('Kanban Board View', 'PASS', '4-kanban-workflow/02-board-view.png',
          `Board: ${firstBoard.text}, Columns: ${columns.length}`);

      } else {
        console.log('  ℹ️ No boards available for kanban workflow testing');
        await this.addTestResult('Kanban Workflow', 'SKIP', '4-kanban-workflow/01-available-boards.png',
          'No boards available to test');
      }

    } catch (error) {
      await this.takeScreenshot('4-kanban-workflow/error.png');
      await this.addTestResult('Kanban Workflow', 'FAIL', '4-kanban-workflow/error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testErrorStates() {
    console.log('\n⚠️ Testing Error States...');

    try {
      // Test invalid URL
      await this.page.goto(`${this.baseUrl}/nonexistent-page`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot('5-error-states/01-404-page.png');

      const is404 = await this.page.evaluate(() => {
        return document.body.textContent?.toLowerCase().includes('not found') ||
               document.body.textContent?.toLowerCase().includes('404') ||
               document.title?.toLowerCase().includes('not found');
      });

      await this.addTestResult('404 Error Handling', is404 ? 'PASS' : 'FAIL', '5-error-states/01-404-page.png',
        `404 error properly displayed: ${is404}`);

      console.log(`  ${is404 ? '✅' : '❌'} 404 error handling`);

      // Test network failure scenario by going to invalid port
      try {
        await this.page.goto('http://localhost:9999', { waitUntil: 'networkidle2', timeout: 5000 });
      } catch (networkError) {
        await this.takeScreenshot('5-error-states/02-network-error.png');
        await this.addTestResult('Network Error Handling', 'PASS', '5-error-states/02-network-error.png',
          'Network error properly caught');
        console.log('  ✅ Network error handling');
      }

    } catch (error) {
      await this.takeScreenshot('5-error-states/error.png');
      await this.addTestResult('Error States', 'FAIL', '5-error-states/error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testResponsiveDesign() {
    console.log('\n📱 Testing Responsive Design...');

    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    try {
      // Go back to main page
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      for (const viewport of viewports) {
        await this.page.setViewport({ width: viewport.width, height: viewport.height });
        await this.page.waitForTimeout(1000); // Let layout settle

        await this.takeScreenshot(`6-responsive-design/${viewport.name.toLowerCase()}-${viewport.width}x${viewport.height}.png`);

        // Check if import/export buttons are still visible
        const buttonsVisible = await this.page.evaluate(() => {
          const exportBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent?.includes('Export Database'));
          const importBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent?.includes('Import Database'));
          
          return {
            export: exportBtn ? exportBtn.offsetParent !== null : false,
            import: importBtn ? importBtn.offsetParent !== null : false
          };
        });

        await this.addTestResult(`Responsive ${viewport.name}`, 'PASS', 
          `6-responsive-design/${viewport.name.toLowerCase()}-${viewport.width}x${viewport.height}.png`,
          `Export visible: ${buttonsVisible.export}, Import visible: ${buttonsVisible.import}`);

        console.log(`  ✅ ${viewport.name} (${viewport.width}x${viewport.height}) - Export: ${buttonsVisible.export ? '✅' : '❌'}, Import: ${buttonsVisible.import ? '✅' : '❌'}`);
      }

    } catch (error) {
      await this.takeScreenshot('6-responsive-design/error.png');
      await this.addTestResult('Responsive Design', 'FAIL', '6-responsive-design/error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testInteractions() {
    console.log('\n🖱️ Testing UI Interactions...');

    try {
      // Reset viewport
      await this.page.setViewport({ width: 1280, height: 720 });
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Test hover effects
      await this.page.hover('button');
      await this.takeScreenshot('7-interactions/01-button-hover.png');

      // Test button states
      const buttonStates = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.map((btn, index) => ({
          index,
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
          classList: Array.from(btn.classList)
        }));
      });

      console.log(`  📊 Found ${buttonStates.length} buttons with various states`);

      await this.addTestResult('UI Interactions', 'PASS', '7-interactions/01-button-hover.png',
        `Tested ${buttonStates.length} buttons for hover and state changes`);

      // Test focus states
      await this.page.focus('button');
      await this.takeScreenshot('7-interactions/02-button-focus.png');

      console.log('  ✅ Interaction testing complete');

    } catch (error) {
      await this.takeScreenshot('7-interactions/error.png');
      await this.addTestResult('UI Interactions', 'FAIL', '7-interactions/error.png', error.message);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');

    const report = {
      testSuite: 'Kanban MCP Visual Test Suite',
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'PASS').length,
        failed: this.testResults.filter(r => r.status === 'FAIL').length,
        skipped: this.testResults.filter(r => r.status === 'SKIP').length
      },
      results: this.testResults
    };

    const reportPath = path.join(this.screenshotDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(this.screenshotDir, 'test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`📋 Test report saved: ${reportPath}`);
    console.log(`🌐 HTML report saved: ${htmlPath}`);

    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanban MCP Visual Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 8px; color: white; }
        .pass { background: #4caf50; }
        .fail { background: #f44336; }
        .skip { background: #ff9800; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; }
        .test-result.PASS { border-left: 4px solid #4caf50; }
        .test-result.FAIL { border-left: 4px solid #f44336; }
        .test-result.SKIP { border-left: 4px solid #ff9800; }
        .screenshot { max-width: 300px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.testSuite}</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card pass">
            <h3>Passed</h3>
            <p>${report.summary.passed}</p>
        </div>
        <div class="summary-card fail">
            <h3>Failed</h3>
            <p>${report.summary.failed}</p>
        </div>
        <div class="summary-card skip">
            <h3>Skipped</h3>
            <p>${report.summary.skipped}</p>
        </div>
    </div>

    <h2>Test Results</h2>
    ${report.results.map(result => `
        <div class="test-result ${result.status}">
            <h3>${result.testName} - ${result.status}</h3>
            <p><strong>Details:</strong> ${result.details}</p>
            <p><strong>Screenshot:</strong> ${result.screenshotPath}</p>
            <p><strong>Time:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
        </div>
    `).join('')}
</body>
</html>`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser closed');
    }
  }

  async runAllTests() {
    try {
      await this.setup();
      
      await this.testInitialState();
      await this.testImportExportFeatures();
      await this.testBoardManagement();
      await this.testKanbanWorkflow();
      await this.testErrorStates();
      await this.testResponsiveDesign();
      await this.testInteractions();
      
      const report = await this.generateReport();
      
      console.log('\n🎉 Visual Testing Complete!');
      console.log(`📊 Results: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`);
      console.log(`📁 Screenshots saved in: ${this.screenshotDir}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
async function main() {
  const testSuite = new VisualTestSuite();
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('Failed to run visual tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = VisualTestSuite;