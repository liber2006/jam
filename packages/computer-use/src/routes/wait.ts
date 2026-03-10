import { Router } from 'express';
import type { IScreenshotProvider, ApiResponse, WaitOptions, WaitResult } from '../types.js';

/** Factory: creates wait route (polls for screen changes) */
export function createWaitRoutes(screenshot: IScreenshotProvider): Router {
  const router = Router();

  router.post('/wait', async (req, res) => {
    const start = Date.now();
    try {
      const { change = false, timeout = 5 } = req.body as WaitOptions;
      const timeoutMs = timeout * 1000;

      if (change) {
        // Take reference screenshot, then poll until it changes
        const reference = await screenshot.capture({ format: 'jpeg', quality: 30 });
        const met = await pollUntilChanged(screenshot, reference.base64, timeoutMs);
        const result: WaitResult = {
          condition: 'screen_change',
          met,
          elapsed_ms: Date.now() - start,
        };
        const response: ApiResponse<WaitResult> = { success: true, data: result, duration_ms: Date.now() - start };
        res.json(response);
        return;
      }

      // Default: just wait the timeout period
      await sleep(Math.min(timeoutMs, 30_000));
      const result: WaitResult = { condition: 'timeout', met: true, elapsed_ms: Date.now() - start };
      const response: ApiResponse<WaitResult> = { success: true, data: result, duration_ms: Date.now() - start };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  return router;
}

async function pollUntilChanged(
  screenshot: IScreenshotProvider,
  referenceBase64: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const pollInterval = 500;

  while (Date.now() < deadline) {
    await sleep(pollInterval);
    const current = await screenshot.capture({ format: 'jpeg', quality: 30 });
    if (current.base64 !== referenceBase64) return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
