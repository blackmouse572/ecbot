import { useEffect, useState } from "react";

/**
 * The current time, refreshed once when `deadline` passes, so time-based UI
 * (e.g. a messaging window closing) updates without the user interacting.
 */
export function useNowAt(deadline: number | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === undefined) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [deadline]);

  return now;
}
