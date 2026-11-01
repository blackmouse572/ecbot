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
 * Measures when the box mounts, when `contentKey` changes, and when the box
 * or one of its direct children (as of mount) resizes.
 */
export function useScrollEdges(contentKey: unknown, onReachEnd?: () => void) {
  const element = useRef<HTMLElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const last = useRef(edges);

  const measure = useCallback((target: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = target;
    const remaining = scrollHeight - clientHeight - scrollTop;
    const top = scrollTop > 0;
    const bottom = remaining > 1;
    // Resizes fire every frame while the window is dragged; skip the
    // re-render when neither edge changed.
    if (last.current.top !== top || last.current.bottom !== bottom) {
      last.current = { top, bottom };
      setEdges(last.current);
    }
    return remaining;
  }, []);

  // A callback ref: the box can mount after its content has loaded (the
  // notification menu opens on cached rows), so measuring only on content
  // changes would miss it.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      element.current = node;
      observer.current?.disconnect();
      observer.current = null;
      if (!node) return;
      measure(node);
      // The window, or rows loading above the fold, can change the overflow
      // without a scroll event.
      observer.current = new ResizeObserver(() => measure(node));
      observer.current.observe(node);
      for (const child of node.children) observer.current.observe(child);
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
