import { ScrollEdgeBlur } from "@/components/layout/main-layout/scroll-edge-blur";
import { ScrollArea } from "@repo/ui/components";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FC, ReactNode } from "react";

/** A row that scrolls sideways on narrow screens, with a soft blur on the
 * side that still has content hidden, like the sidebar. */
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

  return (
    <div className="relative min-w-0">
      <ScrollArea ref={root} onScrollCapture={measure}>
        {children}
      </ScrollArea>
      <ScrollEdgeBlur
        side="left"
        visible={edges.start}
        className="z-10"
        testId="row-shadow-left"
      />
      <ScrollEdgeBlur
        side="right"
        visible={edges.end}
        className="z-10"
        testId="row-shadow-right"
      />
    </div>
  );
};
