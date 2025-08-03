import puppeteer, { Browser } from 'puppeteer';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisible(): R;
      toHaveText(text: string): R;
    }
  }
}

// Setup global browser for all tests
let browser: Browser;

beforeAll(async () => {
  const headless = process.env.HEADLESS !== 'false' && process.env.DEBUG !== 'true';
  const devtools = process.env.DEBUG === 'true';
  
  browser = await puppeteer.launch({
    headless: headless,
    devtools,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-features=VizDisplayCompositor',
    ],
    slowMo: process.env.DEBUG === 'true' ? 50 : 0,
  });
});

afterAll(async () => {
  if (browser) {
    await browser.close();
  }
});

// Make browser available globally
(global as any).browser = browser;