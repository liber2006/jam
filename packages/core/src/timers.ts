/**
 * Disposable timer wrappers — VS Code-inspired pattern.
 *
 * Never use raw `setTimeout` / `setInterval` directly. These wrappers
 * implement IDisposable for deterministic cleanup, prevent use-after-dispose,
 * and integrate with DisposableStore for lifecycle management.
 *
 * @see https://github.com/microsoft/vscode/blob/main/src/vs/base/common/async.ts
 */

import type { IDisposable } from './disposable.js';
import { toDisposable } from './disposable.js';

/**
 * Disposable wrapper around `setTimeout`.
 * Clears the timer on dispose. Throws on use-after-dispose.
 */
export class TimeoutTimer implements IDisposable {
  private _token: ReturnType<typeof setTimeout> | undefined;
  private _isDisposed = false;

  dispose(): void {
    this.cancel();
    this._isDisposed = true;
  }

  /** Cancel any pending timeout. */
  cancel(): void {
    if (this._token !== undefined) {
      clearTimeout(this._token);
      this._token = undefined;
    }
  }

  /** Cancel any existing timeout and set a new one. */
  cancelAndSet(runner: () => void, timeout: number): void {
    if (this._isDisposed) {
      throw new Error('TimeoutTimer is disposed');
    }
    this.cancel();
    this._token = setTimeout(() => {
      this._token = undefined;
      runner();
    }, timeout);
  }

  /** Set the timeout only if one isn't already pending. */
  setIfNotSet(runner: () => void, timeout: number): void {
    if (this._isDisposed) {
      throw new Error('TimeoutTimer is disposed');
    }
    if (this._token !== undefined) return;
    this._token = setTimeout(() => {
      this._token = undefined;
      runner();
    }, timeout);
  }

  get isScheduled(): boolean {
    return this._token !== undefined;
  }
}

/**
 * Disposable wrapper around `setInterval`.
 * Clears the interval on dispose. Throws on use-after-dispose.
 */
export class IntervalTimer implements IDisposable {
  private _disposable: IDisposable | undefined;
  private _isDisposed = false;

  /** Cancel the current interval. */
  cancel(): void {
    this._disposable?.dispose();
    this._disposable = undefined;
  }

  /** Cancel any existing interval and set a new one. */
  cancelAndSet(runner: () => void, interval: number): void {
    if (this._isDisposed) {
      throw new Error('IntervalTimer is disposed');
    }
    this.cancel();
    const handle = setInterval(runner, interval);
    this._disposable = toDisposable(() => {
      clearInterval(handle);
      this._disposable = undefined;
    });
  }

  dispose(): void {
    this.cancel();
    this._isDisposed = true;
  }
}

/**
 * Schedule a callback to run once after a delay, with cancel/reschedule/flush.
 * Like setTimeout but with richer semantics and IDisposable lifecycle.
 */
export class RunOnceScheduler implements IDisposable {
  private _runner: ((...args: unknown[]) => void) | null;
  private _token: ReturnType<typeof setTimeout> | undefined;
  private _timeout: number;

  constructor(runner: (...args: unknown[]) => void, delay: number) {
    this._runner = runner;
    this._timeout = delay;
  }

  dispose(): void {
    this.cancel();
    this._runner = null;
  }

  /** Cancel any pending execution. */
  cancel(): void {
    if (this._token !== undefined) {
      clearTimeout(this._token);
      this._token = undefined;
    }
  }

  /** Schedule (or reschedule) execution after the configured delay. */
  schedule(delay = this._timeout): void {
    this.cancel();
    this._token = setTimeout(() => {
      this._token = undefined;
      this._runner?.();
    }, delay);
  }

  get isScheduled(): boolean {
    return this._token !== undefined;
  }

  /** If scheduled, cancel and run immediately. */
  flush(): void {
    if (this.isScheduled) {
      this.cancel();
      this._runner?.();
    }
  }

  get delay(): number {
    return this._timeout;
  }

  set delay(value: number) {
    this._timeout = value;
  }
}
