const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshot() {
  let browser = null;
  
  try {
    console.log('Attempting to launch browser with different configurations...');
    
    // Try different launch configurations
    const launchConfigs = [
      {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--no-first-run',
          '--disable-default-apps'
        ]
      },
      {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      },
      {
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      }
    ];
    
    for (let i = 0; i < launchConfigs.length; i++) {
      try {
        console.log(`Trying configuration ${i + 1}...`);
        browser = await puppeteer.launch(launchConfigs[i]);
        console.log('✅ Browser launched successfully!');
        break;
      } catch (error) {
        console.log(`❌ Configuration ${i + 1} failed:`, error.message);
        if (browser) {
          try { await browser.close(); } catch {}
          browser = null;
        }
      }
    }
    
    if (!browser) {
      throw new Error('All browser launch configurations failed');
    }
    
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
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for buttons
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        disabled: btn.disabled
      }));
    });
    
    console.log('Found buttons:', buttons);
    
    // Look specifically for import/export buttons
    const exportButton = buttons.find(btn => btn.text?.includes('Export Database'));
    const importButton = buttons.find(btn => btn.text?.includes('Import Database'));
    
    console.log('Export button found:', exportButton ? '✅' : '❌');
    console.log('Import button found:', importButton ? '✅' : '❌');
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'ui-with-buttons.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Take a focused screenshot of just the buttons area
    const buttonsElement = await page.$('div'); // Find container with buttons
    if (buttonsElement) {
      const focusedScreenshotPath = path.join(__dirname, 'screenshots', 'buttons-focused.png');
      await buttonsElement.screenshot({ path: focusedScreenshotPath });
      console.log(`📸 Focused screenshot saved to: ${focusedScreenshotPath}`);
    }
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

takeScreenshot();