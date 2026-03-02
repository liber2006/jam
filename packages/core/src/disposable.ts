/**
 * Disposable pattern — VS Code-inspired lifecycle management.
 *
 * Provides `IDisposable`, `Disposable` base class, and `DisposableStore`
 * for deterministic resource cleanup. All timers, event subscriptions,
 * and long-lived resources should implement IDisposable.
 *
 * @see https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts
 */

/** Contract for objects that hold resources requiring explicit cleanup. */
export interface IDisposable {
  dispose(): void;
}

/** Wrap a cleanup function as an IDisposable. */
export function toDisposable(fn: () => void): IDisposable {
  return { dispose: fn };
}

/**
 * Manages a collection of disposables with safe lifecycle semantics.
 * Preferred over raw arrays — handles double-dispose, post-dispose additions,
 * and guarantees all children are cleaned up.
 */
export class DisposableStore implements IDisposable {
  private readonly _toDispose = new Set<IDisposable>();
  private _isDisposed = false;

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /** Add a disposable to the store. Returns the same disposable for chaining. */
  add<T extends IDisposable>(o: T): T {
    if (this._isDisposed) {
      // Dispose immediately — caller added to an already-dead store
      o.dispose();
      return o;
    }
    this._toDispose.add(o);
    return o;
  }

  /** Remove and dispose a specific disposable. */
  delete<T extends IDisposable>(o: T): void {
    if (this._toDispose.delete(o)) {
      o.dispose();
    }
  }

  /** Dispose all children and mark the store as disposed. */
  dispose(): void {
    if (this._isDisposed) return;
    this._isDisposed = true;
    for (const d of this._toDispose) {
      try {
        d.dispose();
      } catch {
        // Swallow — one failing disposable shouldn't block the rest
      }
    }
    this._toDispose.clear();
  }

  /** Dispose all children but keep the store alive for reuse. */
  clear(): void {
    for (const d of this._toDispose) {
      try {
        d.dispose();
      } catch {
        // Swallow
      }
    }
    this._toDispose.clear();
  }
}

/**
 * Abstract base class with built-in DisposableStore.
 * Subclasses register child disposables via `_register()`.
 */
export abstract class Disposable implements IDisposable {
  static readonly None: IDisposable = Object.freeze({ dispose() {} });

  protected readonly _store = new DisposableStore();

  protected _register<T extends IDisposable>(o: T): T {
    return this._store.add(o);
  }

  dispose(): void {
    this._store.dispose();
  }
}
