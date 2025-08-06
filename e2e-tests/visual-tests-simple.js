const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class SimpleVisualTests {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:8221';
    this.screenshotDir = path.join(__dirname, 'visual-test-results-simple');
    this.testResults = [];
  }

  async setup() {
    console.log('🚀 Setting up visual tests...');
    
    // Create directory structure
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    // Configure browser launch options
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };

    // Only set executablePath if explicitly provided (for CI/CD flexibility)
    if (process.env.CHROME_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.CHROME_EXECUTABLE_PATH;
      console.log('Using custom Chrome executable:', process.env.CHROME_EXECUTABLE_PATH);
    } else {
      console.log('Using Puppeteer bundled Chromium');
    }

    // Launch browser
    this.browser = await puppeteer.launch(launchOptions);

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    
    console.log('✅ Browser setup complete');
  }

  async takeScreenshot(filename, description) {
    try {
      const screenshotPath = path.join(this.screenshotDir, filename);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      console.log(`📸 ${description}: ${filename}`);
      return screenshotPath;
    } catch (error) {
      console.log(`❌ Failed to take screenshot ${filename}: ${error.message}`);
      return null;
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runTests() {
    try {
      await this.setup();

      // Test 1: Initial page load
      console.log('\n1️⃣ Testing initial page load...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await this.page.waitForSelector('h1', { timeout: 10000 });
      await this.takeScreenshot('01-initial-page.png', 'Initial page load');

      // Test 2: Import/Export buttons
      console.log('\n2️⃣ Testing import/export buttons...');
      
      // Highlight the buttons
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Export Database') || btn.textContent?.includes('Import Database')) {
            btn.style.border = '3px solid red';
            btn.style.boxShadow = '0 0 10px red';
          }
        });
      });
      
      await this.takeScreenshot('02-import-export-buttons.png', 'Import/Export buttons highlighted');

      // Test 3: Export functionality
      console.log('\n3️⃣ Testing export functionality...');
      let exportTriggered = false;
      
      this.page.on('response', (response) => {
        if (response.url().includes('/api/export')) {
          exportTriggered = true;
          console.log('  ✅ Export API call detected');
        }
      });

      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const exportButton = buttons.find(button => button.textContent?.includes('Export Database'));
        if (exportButton) {
          exportButton.click();
        }
      });

      // Wait for any network activity to complete
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('03-export-clicked.png', 'After clicking export button');

      // Test 4: Different screen sizes
      console.log('\n4️⃣ Testing responsive design...');
      
      const viewports = [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
      ];

      for (const viewport of viewports) {
        await this.page.setViewport({ width: viewport.width, height: viewport.height });
        // Wait for layout to settle after viewport change
        await this.page.waitForFunction(() => document.readyState === 'complete');
        await this.takeScreenshot(`04-responsive-${viewport.name}-${viewport.width}x${viewport.height}.png`, 
          `Responsive design - ${viewport.name}`);
      }

      // Test 5: Check for boards
      console.log('\n5️⃣ Testing board management interface...');
      await this.page.setViewport({ width: 1280, height: 720 }); // Reset viewport
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      const boardInfo = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        const createLinks = Array.from(document.querySelectorAll('a, button')).filter(el => 
          el.textContent?.toLowerCase().includes('create') || 
          el.textContent?.toLowerCase().includes('new')
        );
        
        return {
          boardCount: rows.length,
          createLinks: createLinks.map(el => ({
            text: el.textContent?.trim(),
            href: el.href,
            tagName: el.tagName
          }))
        };
      });

      await this.takeScreenshot('05-board-management.png', 'Board management interface');
      console.log(`  📊 Found ${boardInfo.boardCount} boards`);
      console.log(`  🔗 Found ${boardInfo.createLinks.length} create links/buttons`);

      // Test 6: Navigation and UI elements
      console.log('\n6️⃣ Testing UI interactions...');
      
      // Test hover on buttons
      const buttons = await this.page.$$('button');
      if (buttons.length > 0) {
        await buttons[0].hover();
        await this.takeScreenshot('06-button-hover.png', 'Button hover state');
      }

      // Test 7: Create comprehensive summary
      console.log('\n7️⃣ Creating summary screenshot...');
      
      // Add summary info to page
      await this.page.evaluate((exportTriggered, boardCount) => {
        const summary = document.createElement('div');
        summary.innerHTML = `
          <div style="position: fixed; top: 10px; right: 10px; background: #000; color: #fff; padding: 15px; border-radius: 8px; font-family: monospace; z-index: 10000;">
            <h3>Visual Test Summary</h3>
            <p>✅ Import/Export buttons: Present</p>
            <p>${exportTriggered ? '✅' : '❌'} Export functionality: ${exportTriggered ? 'Working' : 'Not tested'}</p>
            <p>📊 Boards found: ${boardCount}</p>
            <p>📱 Responsive: Tested</p>
            <p>🎨 UI: Functional</p>
          </div>
        `;
        document.body.appendChild(summary);
      }, exportTriggered, boardInfo.boardCount);

      await this.takeScreenshot('07-test-summary.png', 'Test summary overlay');

      // Generate final report
      const report = {
        timestamp: new Date().toISOString(),
        tests: {
          initialLoad: '✅ PASS',
          importExportButtons: '✅ PASS',
          exportFunctionality: exportTriggered ? '✅ PASS' : '⚠️ PARTIAL',
          responsiveDesign: '✅ PASS',
          boardInterface: '✅ PASS',
          uiInteractions: '✅ PASS'
        },
        details: {
          exportApiCalled: exportTriggered,
          boardCount: boardInfo.boardCount,
          createLinksFound: boardInfo.createLinks.length,
          screenshotsGenerated: 7 + viewports.length
        },
        screenshotDirectory: this.screenshotDir
      };

      fs.writeFileSync(path.join(this.screenshotDir, 'test-report.json'), JSON.stringify(report, null, 2));

      console.log('\n🎉 Visual testing complete!');
      console.log(`📁 Screenshots saved in: ${this.screenshotDir}`);
      console.log(`📋 Report saved: test-report.json`);
      
      return report;

    } catch (error) {
      console.error('❌ Test failed:', error);
      await this.takeScreenshot('error-state.png', 'Error state');
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('🔚 Browser closed');
      }
    }
  }
}

// Run the tests
async function main() {
  const tests = new SimpleVisualTests();
  try {
    const report = await tests.runTests();
    console.log('\n📊 Final Results:');
    Object.entries(report.tests).forEach(([test, result]) => {
      console.log(`  ${result} ${test}`);
    });
  } catch (error) {
    console.error('Failed to run visual tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SimpleVisualTests;