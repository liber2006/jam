import type {
  IBrowserProvider,
  BrowserLaunchOptions,
  BrowserNavigateOptions,
  BrowserClickOptions,
  BrowserTypeOptions,
  BrowserEvalOptions,
  BrowserWaitOptions,
  ScreenshotResult,
} from '../types.js';

/**
 * Browser automation provider using Playwright.
 * Implements IBrowserProvider (DIP).
 * SRP: only handles browser automation — no desktop/window ops.
 *
 * Playwright is dynamically imported to avoid requiring it when browser
 * automation isn't used. This keeps the package lightweight for non-browser
 * scenarios.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlaywrightBrowser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlaywrightPage = any;

export class PlaywrightBrowserProvider implements IBrowserProvider {
  private browser: PlaywrightBrowser = null;
  private page: PlaywrightPage = null;

  async launch(options?: BrowserLaunchOptions): Promise<void> {
    if (this.browser) {
      // Navigate existing browser instead of relaunching
      if (options?.url && this.page) {
        await this.page.goto(options.url, { waitUntil: 'domcontentloaded' });
      }
      return;
    }

    const pw = await this.loadPlaywright();
    this.browser = await pw.chromium.launch({
      headless: options?.headless ?? false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const context = await this.browser.newContext({ viewport: { width: 1280, height: 720 } });
    this.page = await context.newPage();

    if (options?.url) {
      await this.page.goto(options.url, { waitUntil: 'domcontentloaded' });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  async navigate(options: BrowserNavigateOptions): Promise<void> {
    this.ensurePage();
    await this.page.goto(options.url, {
      waitUntil: options.waitUntil ?? 'domcontentloaded',
    });
  }

  async snapshot(): Promise<string> {
    this.ensurePage();
    return await this.page.accessibility.snapshot()
      .then((snap: unknown) => JSON.stringify(snap, null, 2))
      .catch(() => '{"error": "accessibility snapshot unavailable"}');
  }

  async click(options: BrowserClickOptions): Promise<void> {
    this.ensurePage();

    if (options.text) {
      await this.page.getByText(options.text, { exact: false }).first().click({
        button: options.right ? 'right' : 'left',
      });
    } else if (options.selector) {
      await this.page.locator(options.selector).first().click({
        button: options.right ? 'right' : 'left',
      });
    } else if (options.x !== undefined && options.y !== undefined) {
      await this.page.mouse.click(options.x, options.y, {
        button: options.right ? 'right' : 'left',
      });
    } else {
      throw new Error('click requires text, selector, or x/y coordinates');
    }
  }

  async type(options: BrowserTypeOptions): Promise<void> {
    this.ensurePage();

    if (options.selector) {
      const locator = this.page.locator(options.selector).first();
      if (options.clear) await locator.clear();
      await locator.fill(options.text);
      if (options.submit) await locator.press('Enter');
    } else {
      // Type into focused element
      await this.page.keyboard.type(options.text);
      if (options.submit) await this.page.keyboard.press('Enter');
    }
  }

  async key(key: string): Promise<void> {
    this.ensurePage();
    // Playwright uses "Control+a", "Enter", "ArrowDown" etc.
    const normalized = key
      .replace(/Cmd/gi, 'Meta')
      .replace(/Command/gi, 'Meta')
      .replace(/Ctrl/gi, 'Control')
      .replace(/Option/gi, 'Alt');
    await this.page.keyboard.press(normalized);
  }

  async screenshot(): Promise<ScreenshotResult> {
    this.ensurePage();
    const buffer = await this.page.screenshot({ type: 'png' });
    return {
      base64: buffer.toString('base64'),
      format: 'png',
      width: 0, // Playwright doesn't easily expose viewport size from screenshot
      height: 0,
    };
  }

  async evaluate(options: BrowserEvalOptions): Promise<unknown> {
    this.ensurePage();
    return await this.page.evaluate(options.expression);
  }

  async wait(options: BrowserWaitOptions): Promise<void> {
    this.ensurePage();
    const timeout = (options.timeout ?? 10) * 1000;

    if (options.text) {
      const locator = this.page.getByText(options.text, { exact: false }).first();
      if (options.gone) {
        await locator.waitFor({ state: 'hidden', timeout });
      } else {
        await locator.waitFor({ state: 'visible', timeout });
      }
    } else if (options.selector) {
      const locator = this.page.locator(options.selector).first();
      if (options.gone) {
        await locator.waitFor({ state: 'hidden', timeout });
      } else {
        await locator.waitFor({ state: 'visible', timeout });
      }
    }
  }

  private ensurePage(): void {
    if (!this.page) {
      throw new Error('Browser not launched. Call POST /browser/launch first.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadPlaywright(): Promise<any> {
    // Try playwright-core first (lighter, no bundled browsers), then full playwright.
    // Variable indirection prevents TypeScript from resolving the module at compile time.
    for (const mod of ['playwright-core', 'playwright']) {
      try {
        return await import(mod);
      } catch { /* try next */ }
    }
    throw new Error(
      'Playwright is not installed. Install playwright-core or playwright.',
    );
  }
}
