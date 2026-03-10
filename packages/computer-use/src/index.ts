// Port interfaces (for consumers that want to depend on abstractions)
export type {
  IScreenshotProvider,
  IInputProvider,
  IWindowProvider,
  IDisplayProvider,
  IBrowserProvider,
  ApiResponse,
  ScreenshotResult,
  ScreenshotOptions,
  ClickOptions,
  TypeOptions,
  KeyOptions,
  ScrollOptions,
  WindowInfo,
  FocusOptions,
  LaunchOptions,
  StatusResult,
  ObserveResult,
  WaitOptions,
  WaitResult,
  BrowserLaunchOptions,
  BrowserNavigateOptions,
  BrowserClickOptions,
  BrowserTypeOptions,
  BrowserEvalOptions,
  BrowserWaitOptions,
} from './types.js';

// Concrete implementations (for composition root / DI container)
export { X11DisplayProvider } from './lib/display.js';
export { ScrotScreenshotProvider } from './lib/screenshot.js';
export { XdotoolInputProvider } from './lib/xdotool.js';
export { WmctrlWindowProvider } from './lib/windows.js';
export { PlaywrightBrowserProvider } from './lib/browser.js';

// Server
export { ComputerUseServer } from './server.js';
export type { ComputerUseServerDeps } from './server.js';
