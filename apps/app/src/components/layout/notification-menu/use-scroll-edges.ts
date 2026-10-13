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
 * Measures when the box mounts and again when `contentKey` changes.
 */
export function useScrollEdges(contentKey: unknown, onReachEnd?: () => void) {
  const element = useRef<HTMLElement | null>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback((target: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = target;
    const remaining = scrollHeight - clientHeight - scrollTop;
    setEdges({ top: scrollTop > 0, bottom: remaining > 1 });
    return remaining;
  }, []);

  // A callback ref: the box mounts when the menu opens, after the rows have
  // already loaded, so measuring only on content changes would miss it.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      element.current = node;
      if (node) measure(node);
    },
    [measure],
  );

  useLayoutEffect(() => {
    if (element.current) measure(element.current);
  }, [contentKey, measure]);

  const onScroll = (event: UIEvent<HTMLElement>) => {
    if (measure(event.currentTarget) < END_THRESHOLD) onReachEnd?.();
  };

  return { ...edges, ref, onScroll };
}
