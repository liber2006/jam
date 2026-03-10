import { Router } from 'express';
import type { IScreenshotProvider, ImageFormat, ApiResponse, ScreenshotResult } from '../types.js';

/** Factory: creates screenshot routes bound to a provider (DIP) */
export function createScreenshotRoutes(provider: IScreenshotProvider): Router {
  const router = Router();

  router.get('/screenshot', async (req, res) => {
    const start = Date.now();
    try {
      const format = (req.query.format as ImageFormat) ?? 'png';
      const quality = req.query.quality ? parseInt(req.query.quality as string, 10) : undefined;
      const region = parseRegion(req.query.region as string | undefined);

      const result = await provider.capture({ format, quality, region });

      const response: ApiResponse<ScreenshotResult> = {
        success: true,
        data: result,
        duration_ms: Date.now() - start,
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - start,
      };
      res.status(500).json(response);
    }
  });

  return router;
}

function parseRegion(raw?: string): { x: number; y: number; width: number; height: number } | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return undefined;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}
