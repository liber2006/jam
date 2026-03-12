import { Router } from 'express';
import type { IWindowProvider, ApiResponse, WindowInfo, FocusOptions, LaunchOptions } from '../types.js';

/** Factory: creates window management routes bound to a provider (DIP) */
export function createWindowRoutes(provider: IWindowProvider): Router {
  const router = Router();

  router.get('/windows', async (_req, res) => {
    const start = Date.now();
    try {
      const windows = await provider.list();
      const response: ApiResponse<WindowInfo[]> = {
        success: true,
        data: windows,
        duration_ms: Date.now() - start,
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/focus', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as FocusOptions;
      if (!options.title && !options.windowId) {
        res.status(400).json({ success: false, error: 'title or windowId required', duration_ms: 0 });
        return;
      }
      await provider.focus(options);
      const response: ApiResponse = { success: true, duration_ms: Date.now() - start };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/launch', async (req, res) => {
    const start = Date.now();
    try {
      const options = req.body as LaunchOptions;
      if (!options.command) {
        res.status(400).json({ success: false, error: 'command is required', duration_ms: 0 });
        return;
      }
      const result = await provider.launch(options);
      const response: ApiResponse<{ pid: number }> = {
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
