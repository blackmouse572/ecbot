import { Text, clx } from "@medusajs/ui";
import type { ChatbotListResponseDto } from "@repo/client";
import { IconAvatar } from "@repo/ui/common-components";
import { Facehash } from "facehash";
import type { ComponentProps, HTMLAttributes } from "react";

/** Look of the generated face: box size, shape, and the palette it cycles. */
const FACE = {
  size: 24,
  className: "text-ui-fg-base rounded-md",
  colorClasses: ["green", "blue", "purple"].map(
    (tone) => `bg-ui-tag-${tone}-icon`,
  ),
};

export type ChatbotNameCellProps = HTMLAttributes<HTMLDivElement> &
  Pick<ChatbotListResponseDto, "name" | "avatar"> & {
    size?: ComponentProps<typeof Text>["size"];
  };

/**
 * Identity cell for a chatbot — or for any person the chatbot table links to.
 * The face is generated from the name, so `avatar` is accepted (call sites
 * forward whatever the API stored) but never rendered.
 */
export const ChatbotNameCell = ({
  name: label,
  avatar,
  size,
  className,
  ...divProps
}: ChatbotNameCellProps) => {
  if (!label) {
    return <Text className="text-ui-fg-muted">-</Text>;
  }

  return (
    <div
      {...divProps}
      className={clx("flex items-center gap-2 min-w-0", className)}
    >
      <IconAvatar className="overflow-hidden">
        <Facehash name={label} {...FACE} />
      </IconAvatar>
      <Text size={size ?? "xsmall"} className="truncate">
        {label}
      </Text>
    </div>
  );
};
