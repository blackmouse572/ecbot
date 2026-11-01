import { clx } from "@medusajs/ui";

interface ScrollEdgeBlurProps {
  /** Which side of the pinned block the fade sits on. */
  side: "top" | "bottom";
  visible: boolean;
  /** Gradient start matching the surface behind the pinned block. */
  fadeFrom?: string;
  /** Overrides the fade's height. */
  className?: string;
}

/** A progressive blur plus color fade over nav that scrolls under a pinned
 * block, shown while there is hidden content on that side. */
export const ScrollEdgeBlur = ({
  side,
  visible,
  fadeFrom = "from-ui-bg-subtle",
  className,
}: ScrollEdgeBlurProps) => {
  // One blur layer whose mask ramps over the full height, so items soften
  // gradually as they approach the pinned block. A short ramp (or stacked
  // bands) reads as a hard line, since a nav row is about as tall as a band.
  const mask = `linear-gradient(${side === "top" ? "to top" : "to bottom"}, transparent, black)`;
  return (
    <div
      aria-hidden
      data-testid={`sidebar-shadow-${side}`}
      className={clx(
        "pointer-events-none absolute inset-x-0 h-24 transition-opacity",
        side === "top" ? "top-full" : "bottom-full",
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
          side === "top" ? "bg-gradient-to-b" : "bg-gradient-to-t",
        )}
      />
    </div>
  );
};
