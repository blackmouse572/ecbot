import { clx } from "@medusajs/ui";
import { motion, useReducedMotion } from "motion/react";
import { useState, type FC } from "react";
import { CONFETTI_COLORS, CONFETTI_COUNT } from "./constants";

const between = (min: number, max: number) => min + Math.random() * (max - min);

const makePieces = () =>
  Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    return {
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 3 === 0,
      x: side * between(40, 300),
      rise: -between(80, 240),
      fall: between(160, 360),
      rotate: side * between(180, 720),
      delay: between(0, 0.15),
      duration: between(1.4, 2.2),
    };
  });

/** A one-shot burst of confetti from the middle of the screen. Skipped
 * when the viewer asks for reduced motion. */
export const Confetti: FC = () => {
  const reduceMotion = useReducedMotion();
  const [pieces] = useState(makePieces);

  if (reduceMotion) return null;

  return (
    <div
      aria-hidden
      data-testid="confetti"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((piece, i) => (
        <motion.span
          key={i}
          className={clx(
            "absolute top-[40%] left-1/2 h-2.5 w-1.5",
            piece.round ? "rounded-full" : "rounded-[2px]",
            piece.color,
          )}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: piece.x,
            y: [0, piece.rise, piece.rise + piece.fall],
            rotate: piece.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeOut",
            times: [0, 0.35, 1],
          }}
        />
      ))}
    </div>
  );
};
