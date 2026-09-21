import { DocumentText, Photo } from "@medusajs/icons";
import { clx, IconButton } from "@medusajs/ui";
import type { ComponentProps, HTMLAttributes } from "react";
import { createContext, useContext } from "react";

// ============================================================================
// Attachment — file/image cards with media, metadata, upload state + actions.
// For composers, message threads and upload lists. @medusajs/ui tokens only.
// ============================================================================

export type AttachmentState =
  | "idle"
  | "uploading"
  | "processing"
  | "error"
  | "done";
export type AttachmentSize = "default" | "sm" | "xs";
export type AttachmentOrientation = "horizontal" | "vertical";

type AttachmentContextValue = {
  state: AttachmentState;
  size: AttachmentSize;
  orientation: AttachmentOrientation;
};

const AttachmentContext = createContext<AttachmentContextValue>({
  state: "done",
  size: "default",
  orientation: "horizontal",
});

const useAttachment = () => useContext(AttachmentContext);

export type AttachmentProps = HTMLAttributes<HTMLDivElement> & {
  state?: AttachmentState;
  size?: AttachmentSize;
  orientation?: AttachmentOrientation;
};

const sizePadding: Record<AttachmentSize, string> = {
  default: "gap-3 p-2",
  sm: "gap-2 p-1.5",
  xs: "gap-1.5 p-1",
};

export const Attachment = ({
  state = "done",
  size = "default",
  orientation = "horizontal",
  className,
  ...props
}: AttachmentProps) => (
  <AttachmentContext.Provider value={{ state, size, orientation }}>
    <div
      data-state={state}
      className={clx(
        "relative flex rounded-lg border bg-ui-bg-subtle",
        orientation === "vertical" ? "flex-col items-start" : "items-center",
        state === "error" ? "border-ui-border-error" : "border-ui-border-base",
        sizePadding[size],
        className,
      )}
      {...props}
    />
  </AttachmentContext.Provider>
);

const mediaSize: Record<AttachmentSize, string> = {
  default: "size-9",
  sm: "size-8",
  xs: "size-6",
};

export type AttachmentMediaProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "icon" | "image";
};

export const AttachmentMedia = ({
  variant = "icon",
  className,
  children,
  ...props
}: AttachmentMediaProps) => {
  const { size } = useAttachment();
  return (
    <div
      className={clx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        variant === "icon" &&
          "bg-ui-bg-component text-ui-fg-muted [&>svg]:size-4",
        mediaSize[size],
        className,
      )}
      {...props}
    >
      {children ?? <DocumentText />}
    </div>
  );
};

export type AttachmentContentProps = HTMLAttributes<HTMLDivElement>;

export const AttachmentContent = ({
  className,
  ...props
}: AttachmentContentProps) => (
  <div className={clx("flex min-w-0 flex-1 flex-col", className)} {...props} />
);

export type AttachmentTitleProps = HTMLAttributes<HTMLSpanElement>;

export const AttachmentTitle = ({
  className,
  ...props
}: AttachmentTitleProps) => {
  const { state } = useAttachment();
  return (
    <span
      className={clx(
        "truncate font-medium text-ui-fg-base text-sm",
        state === "uploading" && "shimmer",
        className,
      )}
      {...props}
    />
  );
};

export type AttachmentDescriptionProps = HTMLAttributes<HTMLSpanElement>;

export const AttachmentDescription = ({
  className,
  ...props
}: AttachmentDescriptionProps) => {
  const { state } = useAttachment();
  return (
    <span
      className={clx(
        "truncate text-xs",
        state === "error" ? "text-ui-fg-error" : "text-ui-fg-muted",
        className,
      )}
      {...props}
    />
  );
};

export type AttachmentActionsProps = HTMLAttributes<HTMLDivElement>;

export const AttachmentActions = ({
  className,
  ...props
}: AttachmentActionsProps) => (
  <div
    className={clx("relative z-10 flex shrink-0 items-center gap-1", className)}
    {...props}
  />
);

export type AttachmentActionProps = ComponentProps<typeof IconButton>;

export const AttachmentAction = ({
  variant = "transparent",
  size = "2xsmall",
  className,
  ...props
}: AttachmentActionProps) => (
  <IconButton
    type="button"
    variant={variant}
    size={size}
    className={className}
    {...props}
  />
);

export type AttachmentTriggerProps = ComponentProps<"a">;

// The overlay link can carry a URL from untrusted (e.g. model-generated)
// content, so only allow navigable schemes — `javascript:`/`data:`/`vbscript:`
// resolve to `undefined` (rendered as a non-navigating anchor).
const sanitizeHref = (href?: string): string | undefined => {
  if (!href) {
    return undefined;
  }
  const trimmed = href.trim();
  try {
    // Resolve against a base so relative URLs classify as http(s) and pass.
    const { protocol } = new URL(trimmed, "http://x.invalid");
    const safe = ["http:", "https:", "mailto:", "tel:"];
    return safe.includes(protocol.toLowerCase()) ? trimmed : undefined;
  } catch {
    return undefined;
  }
};

/** Full-card overlay for making the whole attachment a link/dialog trigger. */
export const AttachmentTrigger = ({
  className,
  href,
  ...props
}: AttachmentTriggerProps) => (
  <a
    className={clx(
      "absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive",
      className,
    )}
    href={sanitizeHref(href)}
    {...props}
  />
);

export type AttachmentGroupProps = HTMLAttributes<HTMLDivElement>;

/** Horizontally scrollable row of attachments with a faded trailing edge. */
export const AttachmentGroup = ({
  className,
  ...props
}: AttachmentGroupProps) => (
  <div
    className={clx(
      "scroll-fade-x flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden",
      className,
    )}
    {...props}
  />
);

export { Photo as AttachmentImageIcon, DocumentText as AttachmentFileIcon };
