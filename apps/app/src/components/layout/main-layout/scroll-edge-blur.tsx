import { clx } from "@medusajs/ui";

type Side = "top" | "bottom" | "left" | "right";

interface ScrollEdgeBlurProps {
  /** Which edge of the scroller has hidden content. */
  side: Side;
  visible: boolean;
  /** Gradient start matching the surface behind the scroller. */
  fadeFrom?: string;
  /** Overrides the fade's size or position. */
  className?: string;
  testId?: string;
}

// Top and bottom sit just past a pinned block (the sidebar header and
// footer); left and right sit on the scroller's own edges.
const PLACEMENT: Record<Side, string> = {
  top: "inset-x-0 h-24 top-full",
  bottom: "inset-x-0 h-24 bottom-full",
  left: "inset-y-0 w-8 left-0",
  right: "inset-y-0 w-8 right-0",
};

// The fade runs away from the edge it sits on.
const FADE: Record<Side, string> = {
  top: "bg-gradient-to-b",
  bottom: "bg-gradient-to-t",
  left: "bg-gradient-to-r",
  right: "bg-gradient-to-l",
};

/** A progressive blur plus color fade over content that scrolls past an
 * edge, shown while there is hidden content on that side. */
export const ScrollEdgeBlur = ({
  side,
  visible,
  fadeFrom = "from-ui-bg-subtle",
  className,
  testId = `sidebar-shadow-${side}`,
}: ScrollEdgeBlurProps) => {
  // One blur layer whose mask ramps over the full size, so items soften
  // gradually as they approach the edge. A short ramp (or stacked bands)
  // reads as a hard line, since a nav row is about as tall as a band.
  const mask = `linear-gradient(to ${side}, transparent, black)`;
  return (
    <div
      aria-hidden
      data-testid={testId}
      className={clx(
        "pointer-events-none absolute transition-opacity",
        PLACEMENT[side],
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      />
      <div
        className={clx(
          "absolute inset-0 to-transparent to-60%",
          fadeFrom,
          FADE[side],
        )}
      />
    </div>
  );
};
