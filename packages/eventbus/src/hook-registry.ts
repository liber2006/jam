import type { IEventBus } from '@jam/core';
import { createLogger } from '@jam/core';

const log = createLogger('HookRegistry');

export type HookHandler = (payload: unknown) => void | Promise<void>;

export interface HookRegistration {
  event: string;
  handler: HookHandler;
  priority: number;
}

export class HookRegistry {
  private hooks: HookRegistration[] = [];
  private unsubscribers: Array<() => void> = [];

  constructor(private eventBus: IEventBus) {}

  register(event: string, handler: HookHandler, priority = 0): void {
    this.hooks.push({ event, handler, priority });
    this.hooks.sort((a, b) => b.priority - a.priority);

    const unsubscribe = this.eventBus.on(event, (payload) => {
      try {
        handler(payload);
      } catch (error) {
        log.error(`Error in hook for "${event}": ${String(error)}`);
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.hooks = [];
  }
}
