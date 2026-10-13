import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type UIEvent,
} from "react";

// How close to the bottom (px) counts as "reached the end".
const END_THRESHOLD = 80;

/**
 * Tracks whether a scroll box has more content above or below, for edge
 * shadows, and calls `onReachEnd` when the reader gets near the bottom.
 * `contentKey` re-measures when the content changes (rows loaded).
 */
export function useScrollEdges(contentKey: unknown, onReachEnd?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback((element: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = element;
    const remaining = scrollHeight - clientHeight - scrollTop;
    setEdges({ top: scrollTop > 0, bottom: remaining > 1 });
    return remaining;
  }, []);

  useLayoutEffect(() => {
    if (ref.current) measure(ref.current);
  }, [contentKey, measure]);

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (measure(event.currentTarget) < END_THRESHOLD) onReachEnd?.();
    },
    [measure, onReachEnd],
  );

  return { ...edges, ref, onScroll };
}
