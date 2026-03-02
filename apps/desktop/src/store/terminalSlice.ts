import type { StateCreator } from 'zustand';
import type { AppStore } from './index';

/** Maximum scrollback entries kept in memory per agent */
const MAX_SCROLLBACK = 500;

/** Maximum execute output string length per agent (~500KB) — prevents unbounded memory growth */
const MAX_EXECUTE_OUTPUT = 500_000;

export interface TerminalBuffer {
  /** Data waiting to be written to a mounted xterm.js instance */
  pendingData: string[];
  /** Scrollback history — kept even after pendingData is flushed.
   *  Used to populate the ThreadDrawer when it mounts after output has passed. */
  scrollback: string[];
}

export interface TerminalSlice {
  terminalBuffers: Record<string, TerminalBuffer>;
  /** Execute output per agent — markdown text for streamdown rendering in ThreadDrawer */
  executeOutput: Record<string, string>;

  appendTerminalData: (agentId: string, data: string) => void;
  flushTerminalData: (agentId: string) => void;
  clearTerminal: (agentId: string) => void;
  appendExecuteOutput: (agentId: string, data: string, clear?: boolean) => void;
}

export const createTerminalSlice: StateCreator<
  AppStore,
  [],
  [],
  TerminalSlice
> = (set) => {
  // Batching state — scoped to this closure instead of module-level,
  // so each store instance (tests, HMR) gets its own independent state.
  const terminalBatchQueue = new Map<string, string[]>();
  let batchRaf: number | null = null;

  const executeOutputQueue = new Map<string, { chunks: string[]; clear: boolean }>();
  let executeRaf: number | null = null;

  function flushBatch(): void {
    batchRaf = null;
    if (terminalBatchQueue.size === 0) return;

    const batch = new Map(terminalBatchQueue);
    terminalBatchQueue.clear();

    set((state) => {
      const updated = { ...state.terminalBuffers };
      for (const [agentId, chunks] of batch) {
        const existing = updated[agentId] ?? { pendingData: [], scrollback: [] };
        const scrollback = existing.scrollback.concat(chunks);
        if (scrollback.length > MAX_SCROLLBACK) {
          scrollback.splice(0, scrollback.length - MAX_SCROLLBACK);
        }
        updated[agentId] = {
          pendingData: existing.pendingData.concat(chunks),
          scrollback,
        };
      }
      return { terminalBuffers: updated };
    });
  }

  function flushExecuteOutputBatch(): void {
    executeRaf = null;
    if (executeOutputQueue.size === 0) return;

    const batch = new Map(executeOutputQueue);
    executeOutputQueue.clear();

    set((state) => {
      const updated = { ...state.executeOutput };
      for (const [agentId, { chunks, clear }] of batch) {
        const prev = clear ? '' : (updated[agentId] ?? '');
        let combined = prev + chunks.join('');
        if (combined.length > MAX_EXECUTE_OUTPUT) {
          combined = combined.slice(-MAX_EXECUTE_OUTPUT);
        }
        updated[agentId] = combined;
      }
      return { executeOutput: updated };
    });
  }

  return {
    terminalBuffers: {},
    executeOutput: {},

    appendTerminalData: (agentId, data) => {
      const queue = terminalBatchQueue.get(agentId);
      if (queue) {
        queue.push(data);
      } else {
        terminalBatchQueue.set(agentId, [data]);
      }
      if (batchRaf === null) {
        batchRaf = requestAnimationFrame(flushBatch);
      }
    },

    flushTerminalData: (agentId) =>
      set((state) => {
        const existing = state.terminalBuffers[agentId];
        if (!existing) return state;
        return {
          terminalBuffers: {
            ...state.terminalBuffers,
            [agentId]: { pendingData: [], scrollback: existing.scrollback },
          },
        };
      }),

    clearTerminal: (agentId) =>
      set((state) => ({
        terminalBuffers: {
          ...state.terminalBuffers,
          [agentId]: { pendingData: [], scrollback: [] },
        },
      })),

    appendExecuteOutput: (agentId, data, clear) => {
      const existing = executeOutputQueue.get(agentId);
      if (existing) {
        if (clear) {
          existing.chunks.length = 0;
          existing.clear = true;
        }
        existing.chunks.push(data);
      } else {
        executeOutputQueue.set(agentId, { chunks: [data], clear: !!clear });
      }
      if (executeRaf === null) {
        executeRaf = requestAnimationFrame(flushExecuteOutputBatch);
      }
    },
  };
};
