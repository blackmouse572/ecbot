import { motion, useReducedMotion } from "motion/react";
import type { FC } from "react";

/** A ring that fades out around the bell once per `flashKey` change. */
export const NotificationBellFlash: FC<{ flashKey: number }> = ({
  flashKey,
}) => {
  const reduceMotion = useReducedMotion();
  if (flashKey === 0) return null;

  return (
    <motion.span
      key={flashKey}
      aria-hidden
      data-testid="notification-bell-flash"
      className="border-ui-tag-red-icon pointer-events-none absolute inset-0 rounded-md border-2"
      initial={{ opacity: 0.9, scale: reduceMotion ? 1 : 0.8 }}
      animate={{ opacity: 0, scale: reduceMotion ? 1 : 1.9 }}
      transition={{
        scale: { duration: 0.9, ease: [0.23, 1, 0.32, 1] },
        opacity: { duration: 1.2, ease: "linear" },
      }}
    />
  );
};
