import { clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

export type Tone = "blue" | "green" | "orange" | "purple" | "red" | "grey";

// Each kind of event keeps one colour everywhere on the page: blue messages,
// green orders and consent, orange reminders, purple stages, red pauses.
const TONE_CLASS: Record<Tone, string> = {
  blue: "bg-ui-tag-blue-bg border-ui-tag-blue-border text-ui-tag-blue-icon",
  green: "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-icon",
  orange:
    "bg-ui-tag-orange-bg border-ui-tag-orange-border text-ui-tag-orange-icon",
  purple:
    "bg-ui-tag-purple-bg border-ui-tag-purple-border text-ui-tag-purple-icon",
  red: "bg-ui-tag-red-bg border-ui-tag-red-border text-ui-tag-red-icon",
  grey: "bg-ui-tag-neutral-bg border-ui-tag-neutral-border text-ui-tag-neutral-icon",
};

/** A round icon in the colour of what it stands for. */
export const ToneIcon: FC<{ tone: Tone; children: ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    aria-hidden
    className={clx(
      "flex size-6 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5",
      TONE_CLASS[tone],
    )}
  >
    {children}
  </span>
);
