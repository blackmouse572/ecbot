import { clx } from "@medusajs/ui";

// Blur radius (px) per layer, lightest first. Each layer covers a band nearer
// the pinned edge, so the nav blurs more the closer it gets to being hidden.
const LAYERS = [0.5, 1, 2, 4];

interface ScrollEdgeBlurProps {
  /** Which side of the pinned block the fade sits on. */
  side: "top" | "bottom";
  visible: boolean;
}

/** A progressive blur plus color fade over nav that scrolls under a pinned
 * block, shown while there is hidden content on that side. */
export const ScrollEdgeBlur = ({ side, visible }: ScrollEdgeBlurProps) => {
  // Fades go away from the pinned block: down below the header, up above
  // the footer.
  const towards = side === "top" ? "to top" : "to bottom";
  const step = 100 / LAYERS.length;
  return (
    <div
      aria-hidden
      data-testid={`sidebar-shadow-${side}`}
      className={clx(
        "pointer-events-none absolute inset-x-0 h-8 transition-opacity",
        side === "top" ? "top-full" : "bottom-full",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      {LAYERS.map((blur, index) => {
        const mask = `linear-gradient(${towards}, transparent ${index * step}%, black ${(index + 1) * step}%)`;
        return (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
      <div
        className={clx(
          "from-ui-bg-subtle absolute inset-0 to-transparent",
          side === "top" ? "bg-gradient-to-b" : "bg-gradient-to-t",
        )}
      />
    </div>
  );
};
