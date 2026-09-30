import { useCallback, useEffect, useState } from "react";

/**
 * Seconds left on a countdown that `start` (re)starts; 0 when idle. Counts
 * against a deadline rather than chained one-second timers, so a throttled
 * background tab still ends on time.
 */
export function useCountdown() {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt, now]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);

  return { secondsLeft: Math.max(0, Math.ceil((endsAt - now) / 1000)), start };
}
