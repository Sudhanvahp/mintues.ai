"use client";
import { useEffect, useRef, useCallback } from "react";

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number,
  onData: (data: T) => void,
  stopCondition: (data: T) => boolean,
  enabled: boolean = true
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const data = await fetcher();
        onData(data);
        if (stopCondition(data)) {
          stop();
        }
      } catch {
        // silently retry
      }
    };

    poll();
    timerRef.current = setInterval(poll, interval);

    return () => stop();
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stop };
}
