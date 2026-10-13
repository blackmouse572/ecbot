import { useEffect, useState } from "react";

/**
 * True in exactly one open tab: the one holding the Web Lock `name`. When
 * that tab closes, the lock passes to another tab. Browsers without Web
 * Locks treat every tab as the leader.
 */
export const useIsLeaderTab = (name: string) => {
  const [isLeader, setIsLeader] = useState(() => !navigator.locks);

  useEffect(() => {
    if (!navigator.locks) return;
    const controller = new AbortController();
    let release: (() => void) | undefined;
    navigator.locks
      .request(
        name,
        { signal: controller.signal },
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
            setIsLeader(true);
          }),
      )
      .catch(() => {
        // Aborted while waiting: this tab unmounted before it led.
      });
    return () => {
      controller.abort();
      release?.();
      setIsLeader(false);
    };
  }, [name]);

  return isLeader;
};
