// ─── Response Envelope ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration_ms: number;
}

// ─── Screenshot ─────────────────────────────────────────────────────────────

export type ImageFormat = 'png' | 'jpeg';

export interface ScreenshotOptions {
  format?: ImageFormat;
  quality?: number;
  region?: { x: number; y: number; width: number; height: number };
}

export interface ScreenshotResult {
  base64: string;
  format: ImageFormat;
  width: number;
  height: number;
}

// ─── Input Actions ──────────────────────────────────────────────────────────

export type MouseButton = 'left' | 'right' | 'middle';

export interface ClickOptions {
  x: number;
  y: number;
  button?: MouseButton;
  double?: boolean;
}

export interface TypeOptions {
  text: string;
  delay?: number;
}

export interface KeyOptions {
  key: string;
}

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface ScrollOptions {
  direction: ScrollDirection;
  amount?: number;
}

// ─── Windows ────────────────────────────────────────────────────────────────

export interface WindowInfo {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface FocusOptions {
  title?: string;
  windowId?: string;
}

export interface LaunchOptions {
  command: string;
  args?: string[];
}

// ─── Wait ───────────────────────────────────────────────────────────────────

export interface WaitOptions {
  /** Wait for screen to visually change */
  change?: boolean;
  /** Wait for text to appear (OCR — future) */
  text?: string;
  /** Timeout in seconds */
  timeout?: number;
}

export interface WaitResult {
  condition: string;
  met: boolean;
  elapsed_ms: number;
}

// ─── Status ─────────────────────────────────────────────────────────────────

export interface StatusResult {
  display: string;
  resolution: string;
  focusedWindow: WindowInfo | null;
}

// ─── Observe (composite) ────────────────────────────────────────────────────

export interface ObserveResult {
  screenshot: ScreenshotResult;
  windows: WindowInfo[];
  focusedWindow: WindowInfo | null;
}

// ─── Browser ────────────────────────────────────────────────────────────────

export interface BrowserLaunchOptions {
  url?: string;
  headless?: boolean;
}

export interface BrowserNavigateOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface BrowserClickOptions {
  selector?: string;
  text?: string;
  x?: number;
  y?: number;
  right?: boolean;
}

export interface BrowserTypeOptions {
  selector?: string;
  text: string;
  clear?: boolean;
  submit?: boolean;
}

export interface BrowserEvalOptions {
  expression: string;
}

export interface BrowserWaitOptions {
  text?: string;
  selector?: string;
  timeout?: number;
  gone?: boolean;
}

// ─── Port Interfaces (DIP) ─────────────────────────────────────────────────

/** Abstraction for screenshot capture (SRP + DIP) */
export interface IScreenshotProvider {
  capture(options?: ScreenshotOptions): Promise<ScreenshotResult>;
}

/** Abstraction for input simulation (SRP + DIP) */
export interface IInputProvider {
  click(options: ClickOptions): Promise<void>;
  type(options: TypeOptions): Promise<void>;
  key(options: KeyOptions): Promise<void>;
  scroll(options: ScrollOptions): Promise<void>;
}

/** Abstraction for window management (SRP + DIP) */
export interface IWindowProvider {
  list(): Promise<WindowInfo[]>;
  getFocused(): Promise<WindowInfo | null>;
  focus(options: FocusOptions): Promise<void>;
  launch(options: LaunchOptions): Promise<{ pid: number }>;
}

/** Abstraction for display management (SRP + DIP) */
export interface IDisplayProvider {
  getDisplay(): string;
  getResolution(): Promise<{ width: number; height: number }>;
  isReady(): Promise<boolean>;
}

/** Abstraction for browser automation (SRP + DIP) */
export interface IBrowserProvider {
  launch(options?: BrowserLaunchOptions): Promise<void>;
  close(): Promise<void>;
  isRunning(): boolean;
  navigate(options: BrowserNavigateOptions): Promise<void>;
  snapshot(): Promise<string>;
  click(options: BrowserClickOptions): Promise<void>;
  type(options: BrowserTypeOptions): Promise<void>;
  key(key: string): Promise<void>;
  screenshot(): Promise<ScreenshotResult>;
  evaluate(options: BrowserEvalOptions): Promise<unknown>;
  wait(options: BrowserWaitOptions): Promise<void>;
}
