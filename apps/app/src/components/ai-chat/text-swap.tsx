import { clx } from "@medusajs/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { FC } from "react";
import { CHAT_EASE_OUT, CHAT_SWAP_DURATION } from "./constants";

type Props = {
  text: string;
  className?: string;
};

/**
 * Swaps `text` in place: the old words lift out with a slight blur while the
 * new ones rise in. `popLayout` takes the old words out of the flow at once,
 * so anything laid out after this (with `layout`) moves to the new width
 * smoothly instead of jumping. Reduced motion keeps only the fade.
 */
export const TextSwap: FC<Props> = ({ text, className }) => {
  const reduce = useReducedMotion();
  const lift = (y: number) =>
    reduce
      ? { opacity: 0 }
      : { opacity: 0, transform: `translateY(${y}px)`, filter: "blur(2px)" };

  return (
    // overflow-x-clip truncates long text while leaving the vertical lift visible.
    <span
      className={clx(
        "relative inline-flex min-w-0 overflow-x-clip whitespace-nowrap",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="inline-block max-w-full truncate"
          initial={lift(6)}
          animate={{
            opacity: 1,
            transform: "translateY(0px)",
            filter: "blur(0px)",
          }}
          exit={lift(-6)}
          transition={{ duration: CHAT_SWAP_DURATION, ease: CHAT_EASE_OUT }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
