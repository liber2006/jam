import { Router } from 'express';
import type {
  IBrowserProvider,
  ApiResponse,
  BrowserLaunchOptions,
  BrowserNavigateOptions,
  BrowserClickOptions,
  BrowserTypeOptions,
  BrowserEvalOptions,
  BrowserWaitOptions,
  ScreenshotResult,
} from '../types.js';

/** Factory: creates browser automation routes bound to a provider (DIP) */
export function createBrowserRoutes(provider: IBrowserProvider): Router {
  const router = Router();

  router.post('/browser/launch', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as BrowserLaunchOptions;
      await provider.launch(options);
      res.json({ success: true, data: { running: true }, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/browser/close', async (_req, res) => {
    const start = Date.now();
    try {
      await provider.close();
      res.json({ success: true, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.get('/browser/status', (_req, res) => {
    res.json({ success: true, data: { running: provider.isRunning() }, duration_ms: 0 } satisfies ApiResponse);
  });

  router.post('/browser/navigate', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as BrowserNavigateOptions;
      if (!options.url) {
        res.status(400).json({ success: false, error: 'url is required', duration_ms: 0 });
        return;
      }
      await provider.navigate(options);
      res.json({ success: true, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.get('/browser/snapshot', async (_req, res) => {
    const start = Date.now();
    try {
      const snapshot = await provider.snapshot();
      const response: ApiResponse<{ snapshot: string }> = {
        success: true,
        data: { snapshot },
        duration_ms: Date.now() - start,
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/browser/click', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as BrowserClickOptions;
      await provider.click(options);
      res.json({ success: true, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/browser/type', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as BrowserTypeOptions;
      if (!options.text) {
        res.status(400).json({ success: false, error: 'text is required', duration_ms: 0 });
        return;
      }
      await provider.type(options);
      res.json({ success: true, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/browser/key', async (req, res) => {
    const start = Date.now();
    try {
      const { key } = req.body as { key: string };
      if (!key) {
        res.status(400).json({ success: false, error: 'key is required', duration_ms: 0 });
        return;
      }
      await provider.key(key);
      res.json({ success: true, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.get('/browser/screenshot', async (_req, res) => {
    const start = Date.now();
    try {
      const result = await provider.screenshot();
      const response: ApiResponse<ScreenshotResult> = {
        success: true,
        data: result,
        duration_ms: Date.now() - start,
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  /** Raw binary browser screenshot — returns PNG bytes directly */
  router.get('/browser/screenshot/raw', async (_req, res) => {
    try {
      const result = await provider.screenshot();
      const buffer = Buffer.from(result.base64, 'base64');
      res.setHeader('Content-Type', result.format === 'jpeg' ? 'image/jpeg' : 'image/png');
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  router.post('/browser/eval', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as BrowserEvalOptions;
      if (!options.expression) {
        res.status(400).json({ success: false, error: 'expression is required', duration_ms: 0 });
        return;
      }
      const result = await provider.evaluate(options);
      const response: ApiResponse<{ result: unknown }> = {
        success: true,
        data: { result },
        duration_ms: Date.now() - start,
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/browser/wait', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as BrowserWaitOptions;
      await provider.wait(options);
      res.json({ success: true, duration_ms: Date.now() - start } satisfies ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  return router;
}
