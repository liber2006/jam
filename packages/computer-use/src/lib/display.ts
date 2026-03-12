import type { IDisplayProvider } from '../types.js';
import { execSync } from './exec.js';

/**
 * X11 display provider — manages Xvfb virtual display.
 * Implements IDisplayProvider (DIP).
 */
export class X11DisplayProvider implements IDisplayProvider {
  private readonly display: string;

  constructor(display = ':99') {
    this.display = display;
    process.env.DISPLAY = this.display;
  }

  getDisplay(): string {
    return this.display;
  }

  async getResolution(): Promise<{ width: number; height: number }> {
    try {
      const output = execSync('xdpyinfo', [], { DISPLAY: this.display });
      const match = output.match(/dimensions:\s+(\d+)x(\d+)/);
      if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
    } catch { /* fallback */ }
    return { width: 1920, height: 1080 };
  }

  async isReady(): Promise<boolean> {
    try {
      execSync('xdpyinfo', ['-display', this.display]);
      return true;
    } catch {
      return false;
    }
  }
}
