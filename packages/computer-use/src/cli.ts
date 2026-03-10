#!/usr/bin/env node

/**
 * CLI entry point — Composition Root.
 * All dependency wiring happens here (no other module knows concrete implementations).
 * This is the single place where abstractions are bound to implementations.
 */

import { X11DisplayProvider } from './lib/display.js';
import { ScrotScreenshotProvider } from './lib/screenshot.js';
import { XdotoolInputProvider } from './lib/xdotool.js';
import { WmctrlWindowProvider } from './lib/windows.js';
import { PlaywrightBrowserProvider } from './lib/browser.js';
import { ComputerUseServer } from './server.js';

const PORT = parseInt(process.env.COMPUTER_USE_PORT ?? '3100', 10);
const DISPLAY = process.env.DISPLAY ?? ':99';

async function main(): Promise<void> {
  console.log(`[computer-use] Starting with DISPLAY=${DISPLAY}, PORT=${PORT}`);

  // Wire concrete implementations to port interfaces
  const display = new X11DisplayProvider(DISPLAY);
  const screenshot = new ScrotScreenshotProvider(DISPLAY);
  const input = new XdotoolInputProvider(DISPLAY);
  const windows = new WmctrlWindowProvider(DISPLAY);
  const browser = new PlaywrightBrowserProvider();

  // Wait for display to be ready
  const ready = await display.isReady();
  if (!ready) {
    console.warn('[computer-use] WARNING: X11 display not detected. Desktop features will fail.');
    console.warn('[computer-use] Make sure Xvfb is running: Xvfb :99 -screen 0 1920x1080x24 -ac &');
  }

  const server = new ComputerUseServer({ display, screenshot, input, windows, browser });
  await server.start(PORT);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[computer-use] Shutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('[computer-use] Fatal error:', error);
  process.exit(1);
});
