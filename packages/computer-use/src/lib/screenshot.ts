import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IScreenshotProvider, ScreenshotOptions, ScreenshotResult, ImageFormat } from '../types.js';
import { execSync } from './exec.js';

/**
 * Screenshot provider using scrot (Linux) or import (ImageMagick).
 * Implements IScreenshotProvider (DIP).
 * Uses Strategy pattern for format selection.
 */
export class ScrotScreenshotProvider implements IScreenshotProvider {
  private readonly display: string;

  constructor(display = ':99') {
    this.display = display;
  }

  async capture(options?: ScreenshotOptions): Promise<ScreenshotResult> {
    const format: ImageFormat = options?.format ?? 'png';
    const quality = options?.quality ?? (format === 'jpeg' ? 80 : undefined);
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const tmpFile = join(tmpdir(), `jam-screenshot-${Date.now()}.${ext}`);

    try {
      const args = this.buildArgs(tmpFile, options);
      execSync('scrot', args, { DISPLAY: this.display });

      // Convert to JPEG with quality if requested
      if (format === 'jpeg' && quality !== undefined) {
        const jpegFile = tmpFile.replace(`.${ext}`, '.jpg');
        execSync('convert', [tmpFile, '-quality', String(quality), jpegFile]);
        const data = readFileSync(jpegFile);
        this.cleanup(tmpFile, jpegFile);
        const { width, height } = this.parseDimensions(data, 'jpeg');
        return { base64: data.toString('base64'), format: 'jpeg', width, height };
      }

      const data = readFileSync(tmpFile);
      this.cleanup(tmpFile);
      const { width, height } = this.parseDimensions(data, format);
      return { base64: data.toString('base64'), format, width, height };
    } catch (error) {
      this.cleanup(tmpFile);
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildArgs(outFile: string, options?: ScreenshotOptions): string[] {
    const args: string[] = [];

    if (options?.region) {
      const { x, y, width, height } = options.region;
      // scrot uses -a for area selection: x,y,w,h
      args.push('-a', `${x},${y},${width},${height}`);
    }

    args.push(outFile);
    return args;
  }

  private parseDimensions(data: Buffer, format: ImageFormat): { width: number; height: number } {
    if (format === 'png' && data.length > 24) {
      // PNG IHDR: width at offset 16, height at offset 20 (4 bytes each, big-endian)
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    }
    // Fallback
    return { width: 0, height: 0 };
  }

  private cleanup(...files: string[]): void {
    for (const f of files) {
      try { unlinkSync(f); } catch { /* ignore */ }
    }
  }
}
