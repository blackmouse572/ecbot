import { useEffect, useState, type RefObject } from "react";

// Width of an element in px, kept current as it resizes; 0 until measured.
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Whole pixels: a window drag fires every frame, and an unchanged value
    // skips the re-render.
    setWidth(Math.round(element.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
