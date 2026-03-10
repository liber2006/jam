import { spawn } from 'node:child_process';
import type { IWindowProvider, WindowInfo, FocusOptions, LaunchOptions } from '../types.js';
import { execSync } from './exec.js';

/**
 * Window management provider using wmctrl + xdotool.
 * Implements IWindowProvider (DIP).
 * SRP: only handles window listing, focus, and app launching.
 */
export class WmctrlWindowProvider implements IWindowProvider {
  private readonly display: string;
  private readonly env: Record<string, string>;

  constructor(display = ':99') {
    this.display = display;
    this.env = { DISPLAY: this.display };
  }

  async list(): Promise<WindowInfo[]> {
    try {
      const output = execSync('wmctrl', ['-l', '-G'], this.env);
      const activeId = this.getActiveWindowId();
      return this.parseWmctrlOutput(output, activeId);
    } catch {
      return [];
    }
  }

  async getFocused(): Promise<WindowInfo | null> {
    try {
      const activeId = this.getActiveWindowId();
      if (!activeId) return null;

      const windows = await this.list();
      return windows.find(w => w.active) ?? null;
    } catch {
      return null;
    }
  }

  async focus(options: FocusOptions): Promise<void> {
    if (options.windowId) {
      execSync('wmctrl', ['-i', '-a', options.windowId], this.env);
    } else if (options.title) {
      execSync('wmctrl', ['-a', options.title], this.env);
    } else {
      throw new Error('Either title or windowId is required');
    }
  }

  async launch(options: LaunchOptions): Promise<{ pid: number }> {
    const { command, args = [] } = options;

    const child = spawn(command, args, {
      env: { ...process.env, ...this.env },
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { pid: child.pid ?? 0 };
  }

  private getActiveWindowId(): string | null {
    try {
      const output = execSync('xdotool', ['getactivewindow'], this.env);
      return output.trim();
    } catch {
      return null;
    }
  }

  /**
   * Parse wmctrl -l -G output.
   * Format: <win_id> <desktop> <x> <y> <width> <height> <hostname> <title>
   */
  private parseWmctrlOutput(output: string, activeId: string | null): WindowInfo[] {
    const windows: WindowInfo[] = [];

    for (const line of output.split('\n')) {
      if (!line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length < 8) continue;

      const id = parts[0];
      const x = parseInt(parts[2], 10);
      const y = parseInt(parts[3], 10);
      const width = parseInt(parts[4], 10);
      const height = parseInt(parts[5], 10);
      // Title is everything after hostname (index 7+)
      const title = parts.slice(7).join(' ');

      // Convert hex wmctrl id to decimal for comparison with xdotool
      const decId = parseInt(id, 16);
      const active = activeId ? decId === parseInt(activeId, 10) : false;

      windows.push({ id, title, x, y, width, height, active });
    }

    return windows;
  }
}
