const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshotWithSystemChrome() {
  let browser = null;
  
  try {
    console.log('Launching browser with system Chrome...');
    
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    console.log('✅ Browser launched successfully with system Chrome!');
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ 
      width: 1280, 
      height: 720,
      deviceScaleFactor: 1
    });
    
    console.log('Navigating to application...');
    await page.goto('http://localhost:8221', { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    console.log('Waiting for page to load...');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Get page info
    const title = await page.title();
    const url = page.url();
    console.log('Page title:', title);
    console.log('Page URL:', url);
    
    // Check for buttons
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        disabled: btn.disabled,
        visible: btn.offsetParent !== null
      }));
    });
    
    console.log('Found buttons:');
    buttons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" (visible: ${btn.visible})`);
    });
    
    // Look specifically for import/export buttons
    const exportButton = buttons.find(btn => btn.text?.includes('Export Database'));
    const importButton = buttons.find(btn => btn.text?.includes('Import Database'));
    
    console.log('\n🔍 Target buttons:');
    console.log('Export Database button:', exportButton ? '✅ Found' : '❌ Not found');
    console.log('Import Database button:', importButton ? '✅ Found' : '❌ Not found');
    
    if (exportButton) {
      console.log('Export button details:', exportButton);
    }
    if (importButton) {
      console.log('Import button details:', importButton);
    }
    
    // Take full page screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'kanban-ui-full.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`\n📸 Full page screenshot saved to: ${screenshotPath}`);
    
    // Take viewport screenshot
    const viewportScreenshotPath = path.join(__dirname, 'screenshots', 'kanban-ui-viewport.png');
    await page.screenshot({ 
      path: viewportScreenshotPath,
      fullPage: false 
    });
    
    console.log(`📸 Viewport screenshot saved to: ${viewportScreenshotPath}`);
    
    // Try to highlight the buttons by adding a red border
    if (exportButton || importButton) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Export Database') || btn.textContent?.includes('Import Database')) {
            btn.style.border = '3px solid red';
            btn.style.boxShadow = '0 0 10px red';
          }
        });
      });
      
      const highlightedScreenshotPath = path.join(__dirname, 'screenshots', 'kanban-ui-highlighted.png');
      await page.screenshot({ 
        path: highlightedScreenshotPath,
        fullPage: false 
      });
      
      console.log(`📸 Highlighted buttons screenshot saved to: ${highlightedScreenshotPath}`);
    }
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔚 Browser closed');
    }
  }
}

takeScreenshotWithSystemChrome();