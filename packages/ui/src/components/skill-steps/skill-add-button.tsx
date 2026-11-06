import { PlusMini } from "@medusajs/icons";
import type { ComponentPropsWithRef, FC } from "react";

// Quiet at rest; brighter while the pointer or focus is in the group it adds
// to; brightest on its own hover or focus. Sit it in a row that is a direct
// child of its `.step-group`. "Nearest group" means a hovered group with no
// hovered group inside it, so a nested branch never lights up its parents
// (Tailwind's named groups would light every ancestor at once). Hover wins
// over focus: a group with a hovered group inside it is not lit by focus, and
// a hovered group with focus inside a nested group defers to that group.
const CLASSES = [
  "inline-flex w-fit items-center gap-x-1 rounded-md px-1.5 py-1",
  "txt-compact-small font-normal text-ui-fg-muted outline-none transition-fg",
  "[.step-group:hover:not(:has(.step-group:hover)):not(:has(.step-group:focus-within))>*>&:not(:hover,:focus-visible)]:text-ui-fg-subtle",
  "[.step-group:focus-within:not(:has(.step-group:focus-within)):not(:has(.step-group:hover))>*>&:not(:hover,:focus-visible)]:text-ui-fg-subtle",
  "hover:text-ui-fg-base focus-visible:text-ui-fg-base focus-visible:shadow-borders-focus",
].join(" ");

export const SkillAddButton: FC<ComponentPropsWithRef<"button">> = ({
  children,
  className,
  ...props
}) => (
  <button
    type="button"
    {...props}
    className={className ? `${CLASSES} ${className}` : CLASSES}
  >
    <PlusMini className="size-2.5" />
    {children}
  </button>
);
