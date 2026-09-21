import type { ComponentProps, HTMLAttributes, SVGProps } from "react";
import { memo } from "react";
import {
  ArrowDownTray,
  ArrowPath,
  ArrowsPointingOut,
  Check,
  Loader,
  OpenRectArrowOut,
  SquareTwoStack,
  XMark,
} from "@medusajs/icons";
import { type IconMap, Streamdown } from "streamdown";
import { clx, IconButton, Tooltip } from "@medusajs/ui";
import {
  Bubble,
  BubbleContent,
  type BubbleContentProps,
  type BubbleVariant,
} from "./bubble";

type IconComponent = React.ComponentType<
  SVGProps<SVGSVGElement> & { size?: number }
>;

function adaptIcon(
  Icon: React.ComponentType<Omit<React.SVGAttributes<SVGElement>, "children">>,
): IconComponent {
  return ({ size, width, height, ...rest }) => (
    <Icon width={size ?? width} height={size ?? height} {...rest} />
  );
}

const designSystemIcons: Partial<IconMap> = {
  CheckIcon: adaptIcon(Check),
  CopyIcon: adaptIcon(SquareTwoStack),
  DownloadIcon: adaptIcon(ArrowDownTray),
  ExternalLinkIcon: adaptIcon(OpenRectArrowOut),
  Loader2Icon: adaptIcon(Loader),
  Maximize2Icon: adaptIcon(ArrowsPointingOut),
  RotateCcwIcon: adaptIcon(ArrowPath),
  XIcon: adaptIcon(XMark),
};

// Chat role → bubble side. Anything that isn't "user" reads as the counterpart.
export type MessageRole = "user" | "assistant" | (string & {});

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole;
  variant?: BubbleVariant;
};

export const Message = ({
  from,
  variant,
  className,
  ...props
}: MessageProps) => (
  <Bubble
    align={from === "user" ? "end" : "start"}
    variant={variant ?? "default"}
    className={clx(
      "group/message gap-2",
      from === "user" ? "is-user" : "is-assistant",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = BubbleContentProps;

export const MessageContent = (props: MessageContentProps) => (
  <BubbleContent data-testid="chat-message" {...props} />
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={clx("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof IconButton> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "transparent",
  ...props
}: MessageActionProps) => {
  const button = (
    <IconButton type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </IconButton>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, icons, ...props }: MessageResponseProps) => (
    <Streamdown
      className={clx(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      icons={{ ...designSystemIcons, ...icons }}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating,
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={clx(
      "mt-4 flex w-full items-center justify-between gap-4",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
