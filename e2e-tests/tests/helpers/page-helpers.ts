import puppeteer from 'puppeteer';

export class PageHelpers {
  constructor(private page: puppeteer.Page) {}

  async waitForSelector(selector: string, timeout = 5000): Promise<puppeteer.ElementHandle<Element> | null> {
    return this.page.waitForSelector(selector, { timeout });
  }

  async clickButton(selector: string): Promise<void> {
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  async clickButtonByText(text: string): Promise<void> {
    const button = await this.page.evaluateHandle((text) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(button => button.textContent?.includes(text));
    }, text);
    
    if (!button) {
      throw new Error(`Button with text "${text}" not found`);
    }
    
    await button.click();
  }

  async uploadFile(inputSelector: string, filePath: string): Promise<void> {
    const input = await this.page.waitForSelector(inputSelector);
    if (!input) {
      throw new Error(`File input not found: ${inputSelector}`);
    }
    await input.uploadFile(filePath);
  }

  async waitForDownload(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout'));
      }, 10000);

      this.page.once('response', async (response) => {
        if (response.url().includes('/api/export')) {
          clearTimeout(timeout);
          const buffer = await response.buffer();
          resolve(buffer.toString());
        }
      });
    });
  }

  async getElementText(selector: string): Promise<string> {
    await this.page.waitForSelector(selector);
    return this.page.$eval(selector, el => el.textContent || '');
  }

  async waitForAlert(): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', (dialog) => {
        const message = dialog.message();
        dialog.accept();
        resolve(message);
      });
    });
  }

  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const element = await this.page.waitForSelector(selector, { timeout: 1000 });
      return element !== null;
    } catch {
      return false;
    }
  }

  async isElementVisibleByText(text: string, elementType = '*'): Promise<boolean> {
    try {
      const element = await this.page.evaluate((text, elementType) => {
        const elements = Array.from(document.querySelectorAll(elementType));
        return elements.some(el => el.textContent?.includes(text));
      }, text, elementType);
      return element;
    } catch {
      return false;
    }
  }

  async clickElementByText(text: string, elementType = '*'): Promise<void> {
    const element = await this.page.evaluateHandle((text, elementType) => {
      const elements = Array.from(document.querySelectorAll(elementType));
      return elements.find(el => el.textContent?.includes(text));
    }, text, elementType);
    
    if (!element) {
      throw new Error(`Element with text "${text}" not found`);
    }
    
    await element.click();
  }

  async getElementTextByContent(text: string, elementType = '*'): Promise<string> {
    return this.page.evaluate((text, elementType) => {
      const elements = Array.from(document.querySelectorAll(elementType));
      const element = elements.find(el => el.textContent?.includes(text));
      return element?.textContent?.trim() || '';
    }, text, elementType);
  }

  async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
    await this.page.waitForSelector(selector);
    return this.page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    const screenshotPath = `./screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }
}

// Extend the page object to include waitForLoadState method
declare module 'puppeteer' {
  interface Page {
    waitForLoadState(state: string): Promise<void>;
  }
}

// Add the waitForLoadState method to the Page prototype
puppeteer.Page.prototype.waitForLoadState = async function(state: string) {
  if (state === 'networkidle') {
    await this.waitForFunction(() => document.readyState === 'complete');
    // Wait a bit longer for network requests to settle
    await new Promise(resolve => setTimeout(resolve, 100));
  } else {
    await this.waitForFunction(() => document.readyState === 'complete');
  }
};