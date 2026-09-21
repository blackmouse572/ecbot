import { clx } from "@medusajs/ui";
import { type PropsWithChildren } from "react";

type IconAvatarSize = "small" | "large" | "xlarge";

type IconAvatarProps = PropsWithChildren<{
  className?: string;
  size?: IconAvatarSize;
}>;

// Per-size sizing/radius pair — the wrapped icon's own radius stays one step
// tighter than the outer shell's, matching @medusajs/ui's avatar scale.
const SIZE_CLASSNAMES: Record<IconAvatarSize, string> = {
  small: "size-7 rounded-md [&>div]:rounded-[4px]",
  large: "size-10 rounded-lg [&>div]:rounded-[6px]",
  xlarge: "size-12 rounded-xl [&>div]:rounded-[10px]",
};

/**
 * Use this component when a design calls for an avatar with an icon.
 *
 * The `<Avatar/>` component from `@medusajs/ui` does not support passing an icon as a child.
 */
export const IconAvatar = ({
  size = "small",
  children,
  className,
}: IconAvatarProps) => {
  return (
    <div
      className={clx(
        "shadow-borders-base flex size-7 shrink-0 items-center justify-center",
        "[&>div]:bg-ui-bg-field [&>div]:text-ui-fg-subtle [&>div]:flex  [&>div]:items-center [&>div]:justify-center",
        SIZE_CLASSNAMES[size],
        className,
      )}
    >
      <div>{children}</div>
    </div>
  );
};
