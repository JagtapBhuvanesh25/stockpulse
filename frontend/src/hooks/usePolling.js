import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Polling hook — calls `fn` immediately and then every `intervalMs`.
 * Stops when component unmounts.
 * Returns { data, loading, error, refresh }.
 */
export function usePolling(fn, intervalMs = 3000) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refresh = useCallback(async () => {
    try {
      const result = await fnRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timerId;

    const tick = async () => {
      if (cancelled) return;
      await refresh();
      if (!cancelled) {
        timerId = setTimeout(tick, intervalMs);
      }
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [intervalMs, refresh]);

  return { data, loading, error, refresh };
}