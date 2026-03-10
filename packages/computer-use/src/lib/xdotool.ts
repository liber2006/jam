import type {
  IInputProvider,
  ClickOptions,
  TypeOptions,
  KeyOptions,
  ScrollOptions,
  MouseButton,
} from '../types.js';
import { execSync } from './exec.js';

/** Button mapping: our API → xdotool button numbers */
const BUTTON_MAP: Record<MouseButton, string> = {
  left: '1',
  middle: '2',
  right: '3',
};

/** Scroll direction → xdotool button (4=up, 5=down, 6=left, 7=right) */
const SCROLL_MAP: Record<string, string> = {
  up: '4',
  down: '5',
  left: '6',
  right: '7',
};

/**
 * Input simulation provider using xdotool.
 * Implements IInputProvider (DIP).
 * SRP: only handles mouse/keyboard input — no window management.
 */
export class XdotoolInputProvider implements IInputProvider {
  private readonly display: string;
  private readonly env: Record<string, string>;

  constructor(display = ':99') {
    this.display = display;
    this.env = { DISPLAY: this.display };
  }

  async click(options: ClickOptions): Promise<void> {
    const { x, y, button = 'left', double = false } = options;

    // Move mouse to position
    execSync('xdotool', ['mousemove', '--sync', String(x), String(y)], this.env);

    // Click
    const args = ['click'];
    if (double) args.push('--repeat', '2', '--delay', '50');
    args.push(BUTTON_MAP[button]);

    execSync('xdotool', args, this.env);
  }

  async type(options: TypeOptions): Promise<void> {
    const { text, delay } = options;
    const args = ['type'];
    if (delay !== undefined) args.push('--delay', String(delay));
    args.push('--clearmodifiers', text);

    execSync('xdotool', args, this.env);
  }

  async key(options: KeyOptions): Promise<void> {
    // xdotool uses '+' for combos: "ctrl+c", "alt+F4", "Return"
    // Normalize common key names
    const key = this.normalizeKey(options.key);
    execSync('xdotool', ['key', '--clearmodifiers', key], this.env);
  }

  async scroll(options: ScrollOptions): Promise<void> {
    const { direction, amount = 3 } = options;
    const button = SCROLL_MAP[direction];
    if (!button) throw new Error(`Invalid scroll direction: ${direction}`);

    execSync('xdotool', ['click', '--repeat', String(amount), '--delay', '50', button], this.env);
  }

  /** Normalize key notation: "Cmd+c" → "super+c", "ctrl+s" → "ctrl+s" */
  private normalizeKey(key: string): string {
    return key
      .replace(/Cmd/gi, 'super')
      .replace(/Command/gi, 'super')
      .replace(/Option/gi, 'alt')
      .replace(/Enter/gi, 'Return')
      .replace(/Esc/gi, 'Escape')
      .replace(/Backspace/gi, 'BackSpace')
      .replace(/Delete/gi, 'Delete')
      .replace(/Tab/gi, 'Tab')
      .replace(/Space/gi, 'space');
  }
}
