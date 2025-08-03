#!/usr/bin/env node

/**
 * Test script to verify browser detection and portability
 * This script demonstrates the improved E2E test configuration
 */

const puppeteer = require('puppeteer');

async function testBrowserDetection() {
  console.log('🔍 Testing E2E Browser Configuration...\n');
  
  // Display environment info
  console.log('Environment Information:');
  console.log('- Platform:', process.platform);
  console.log('- Architecture:', process.arch);
  console.log('- Node.js:', process.version);
  console.log('- Chrome Path:', process.env.CHROME_EXECUTABLE_PATH || 'Not set (will use bundled Chromium)');
  console.log('');

  let browser = null;
  try {
    // Configure browser options (same as in E2E tests)
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };

    // Only set executablePath if explicitly provided
    if (process.env.CHROME_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.CHROME_EXECUTABLE_PATH;
      console.log('✅ Using custom Chrome executable:', process.env.CHROME_EXECUTABLE_PATH);
    } else {
      console.log('✅ Using Puppeteer bundled Chromium (recommended for CI/CD)');
    }

    console.log('\n🚀 Launching browser...');
    browser = await puppeteer.launch(launchOptions);
    
    const version = await browser.version();
    console.log('✅ Browser launched successfully!');
    console.log('- Browser version:', version);

    // Test basic functionality
    const page = await browser.newPage();
    await page.goto('data:text/html,<h1>E2E Test Configuration Working!</h1>');
    const title = await page.$eval('h1', el => el.textContent);
    
    console.log('- Page content loaded:', title);
    console.log('\n🎉 E2E test environment is properly configured!');
    
    await page.close();
    
  } catch (error) {
    console.error('❌ Browser configuration test failed:');
    console.error('Error:', error.message);
    console.log('\n🔧 Troubleshooting suggestions:');
    
    if (error.message.includes('not found')) {
      console.log('- Remove CHROME_EXECUTABLE_PATH to use bundled Chromium');
      console.log('- Or install Chrome/Chromium system-wide');
    }
    
    if (error.message.includes('sandbox')) {
      console.log('- Running in Docker/CI? The --no-sandbox flag should handle this');
      console.log('- Check container security policies');
    }
    
    process.exit(1);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testBrowserDetection().catch(console.error);