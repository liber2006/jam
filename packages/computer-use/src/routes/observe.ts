import { Router } from 'express';
import type { IScreenshotProvider, IWindowProvider, ApiResponse, ObserveResult } from '../types.js';

export interface ObserveRouteDeps {
  screenshot: IScreenshotProvider;
  windows: IWindowProvider;
}

/**
 * Composite observation route — screenshot + windows + focused window.
 * Composes multiple providers (Composite pattern + DIP).
 */
export function createObserveRoutes(deps: ObserveRouteDeps): Router {
  const router = Router();

  router.get('/observe', async (req, res) => {
    const start = Date.now();
    try {
      const format = (req.query.format as 'png' | 'jpeg') ?? 'jpeg';
      const quality = req.query.quality ? parseInt(req.query.quality as string, 10) : 60;

      // Parallel capture for speed
      const [screenshot, windows] = await Promise.all([
        deps.screenshot.capture({ format, quality }),
        deps.windows.list(),
      ]);

      const focusedWindow = windows.find(w => w.active) ?? null;

      const result: ObserveResult = { screenshot, windows, focusedWindow };
      const response: ApiResponse<ObserveResult> = {
        success: true,
        data: result,
        duration_ms: Date.now() - start,
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  return router;
}
