import { Router } from 'express';
import type { IDisplayProvider, IWindowProvider, ApiResponse, StatusResult } from '../types.js';

export interface StatusRouteDeps {
  display: IDisplayProvider;
  windows: IWindowProvider;
}

/** Factory: creates status route (DIP — depends on abstractions) */
export function createStatusRoutes(deps: StatusRouteDeps): Router {
  const router = Router();

  router.get('/status', async (_req, res) => {
    const start = Date.now();
    try {
      const [resolution, focusedWindow] = await Promise.all([
        deps.display.getResolution(),
        deps.windows.getFocused(),
      ]);

      const result: StatusResult = {
        display: deps.display.getDisplay(),
        resolution: `${resolution.width}x${resolution.height}`,
        focusedWindow,
      };

      const response: ApiResponse<StatusResult> = {
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
