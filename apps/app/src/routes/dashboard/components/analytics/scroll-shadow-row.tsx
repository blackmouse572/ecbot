import { clx } from "@medusajs/ui";
import { ScrollArea } from "@repo/ui/components";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FC, ReactNode } from "react";

/** A row that scrolls sideways on narrow screens, with a soft shadow on the
 * side that still has content hidden. */
export const ScrollShadowRow: FC<{ children: ReactNode }> = ({ children }) => {
  const root = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const viewport = root.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    if (!viewport) return;
    const { scrollLeft, scrollWidth, clientWidth } = viewport;
    setEdges({
      start: scrollLeft > 1,
      end: scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [measure]);

  const shadow =
    "pointer-events-none absolute inset-y-0 z-10 w-8 transition-opacity duration-150";
  return (
    <div className="relative min-w-0">
      <ScrollArea ref={root} onScrollCapture={measure}>
        {children}
      </ScrollArea>
      <div
        aria-hidden
        className={clx(
          shadow,
          "from-ui-bg-subtle left-0 bg-gradient-to-r to-transparent",
          edges.start ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={clx(
          shadow,
          "from-ui-bg-subtle right-0 bg-gradient-to-l to-transparent",
          edges.end ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
};
