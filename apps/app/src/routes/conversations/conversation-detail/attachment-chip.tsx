import { clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

const chipClass =
  "txt-compact-small border-ui-border-base bg-ui-bg-component text-ui-fg-subtle flex items-center gap-1.5 rounded-lg border px-3 py-2";

/** A small labelled box for an attachment the inbox does not draw; a link
 *  when the attachment has a url. */
export const AttachmentChip: FC<{
  icon: ReactNode;
  label: string;
  url?: string;
}> = ({ icon, label, url }) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={clx(chipClass, "hover:bg-ui-bg-component-hover")}
    >
      {icon}
      {label}
    </a>
  ) : (
    <span className={chipClass}>
      {icon}
      {label}
    </span>
  );
