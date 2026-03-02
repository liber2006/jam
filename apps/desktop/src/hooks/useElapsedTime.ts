import { useEffect, useReducer } from 'react';

/**
 * Forces a re-render once per second while `active` is true.
 * Uses requestAnimationFrame instead of setInterval — aligns with
 * the browser's paint cycle and automatically pauses when the tab
 * is hidden (saving CPU).
 */
export function useElapsedTime(active: boolean): void {
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!active) return;

    let rafId: number;
    let lastTick = performance.now();

    const loop = (now: number) => {
      if (now - lastTick >= 1000) {
        lastTick = now;
        tick();
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active]);
}
