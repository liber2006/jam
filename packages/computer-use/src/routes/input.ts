import { Router } from 'express';
import type {
  IInputProvider,
  ApiResponse,
  ClickOptions,
  TypeOptions,
  KeyOptions,
  ScrollOptions,
} from '../types.js';

/** Factory: creates input routes bound to a provider (DIP) */
export function createInputRoutes(provider: IInputProvider): Router {
  const router = Router();

  router.post('/click', async (req, res) => {
    const start = Date.now();
    try {
      const { x, y, button, double: dbl } = req.body as ClickOptions;
      if (x === undefined || y === undefined) {
        res.status(400).json({ success: false, error: 'x and y are required', duration_ms: 0 });
        return;
      }
      await provider.click({ x, y, button, double: dbl });
      const response: ApiResponse = { success: true, duration_ms: Date.now() - start };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/type', async (req, res) => {
    const start = Date.now();
    try {
      const { text, delay } = req.body as TypeOptions;
      if (!text) {
        res.status(400).json({ success: false, error: 'text is required', duration_ms: 0 });
        return;
      }
      await provider.type({ text, delay });
      const response: ApiResponse = { success: true, duration_ms: Date.now() - start };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/key', async (req, res) => {
    const start = Date.now();
    try {
      const { key } = req.body as KeyOptions;
      if (!key) {
        res.status(400).json({ success: false, error: 'key is required', duration_ms: 0 });
        return;
      }
      await provider.key({ key });
      const response: ApiResponse = { success: true, duration_ms: Date.now() - start };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  router.post('/scroll', async (req, res) => {
    const start = Date.now();
    try {
      const { direction, amount } = req.body as ScrollOptions;
      if (!direction) {
        res.status(400).json({ success: false, error: 'direction is required', duration_ms: 0 });
        return;
      }
      await provider.scroll({ direction, amount });
      const response: ApiResponse = { success: true, duration_ms: Date.now() - start };
      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error), duration_ms: Date.now() - start });
    }
  });

  return router;
}
