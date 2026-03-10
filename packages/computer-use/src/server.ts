import express from 'express';
import type {
  IScreenshotProvider,
  IInputProvider,
  IWindowProvider,
  IDisplayProvider,
  IBrowserProvider,
} from './types.js';
import { createScreenshotRoutes } from './routes/screenshot.js';
import { createInputRoutes } from './routes/input.js';
import { createWindowRoutes } from './routes/windows.js';
import { createStatusRoutes } from './routes/status.js';
import { createObserveRoutes } from './routes/observe.js';
import { createWaitRoutes } from './routes/wait.js';
import { createBrowserRoutes } from './routes/browser.js';

/**
 * Server dependencies — injected via constructor (DIP).
 * Each provider is a port interface, keeping the server decoupled
 * from implementation details (xdotool, scrot, Playwright, etc.).
 */
export interface ComputerUseServerDeps {
  display: IDisplayProvider;
  screenshot: IScreenshotProvider;
  input: IInputProvider;
  windows: IWindowProvider;
  browser: IBrowserProvider;
}

/**
 * Computer Use HTTP server.
 * Composes route modules (SRP) with injected providers (DIP).
 * Each route factory receives only the providers it needs (ISP).
 */
export class ComputerUseServer {
  private readonly app: express.Application;
  private server: ReturnType<express.Application['listen']> | null = null;

  constructor(private readonly deps: ComputerUseServerDeps) {
    this.app = express();
    this.app.use(express.json({ limit: '10mb' }));
    this.registerRoutes();
  }

  /** Start listening on the given port */
  start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, '0.0.0.0', () => {
        console.log(`[computer-use] Server listening on port ${port}`);
        resolve();
      });
    });
  }

  /** Graceful shutdown */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
    await this.deps.browser.close();
  }

  private registerRoutes(): void {
    // Desktop routes — each factory receives only its required providers (ISP)
    this.app.use(createScreenshotRoutes(this.deps.screenshot));
    this.app.use(createInputRoutes(this.deps.input));
    this.app.use(createWindowRoutes(this.deps.windows));
    this.app.use(createStatusRoutes({ display: this.deps.display, windows: this.deps.windows }));
    this.app.use(createObserveRoutes({ screenshot: this.deps.screenshot, windows: this.deps.windows }));
    this.app.use(createWaitRoutes(this.deps.screenshot));

    // Browser routes
    this.app.use(createBrowserRoutes(this.deps.browser));

    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ ok: true, uptime: process.uptime() });
    });
  }
}
