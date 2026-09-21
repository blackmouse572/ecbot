import { ArrowDownTray } from "@medusajs/icons";
import { clx, IconButton } from "@medusajs/ui";
import type { ComponentProps } from "react";
import { useCallback } from "react";

// Scrolling now lives in `./message-scroller` (intent-aware, replaces
// `use-stick-to-bottom`). This file keeps the transcript-agnostic helpers:
// the empty state, the markdown download button, and the message shape.

export type UIMessage = {
  id: string;
  role: string;
  parts: Array<{ type: "text" | "url"; text: string }>;
};

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={clx(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-ui-fg-muted">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-ui-fg-muted text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMessageText = (message: Record<string, any>): string =>
  message.parts
    .filter((part: { type: "text" | "url" }) => part.type === "text")
    .map((part: { text: string }) => part.text)
    .join("");

export type ConversationDownloadProps = Omit<
  ComponentProps<typeof IconButton>,
  "onClick"
> & {
  messages: UIMessage[];
  filename?: string;
  formatMessage?: (message: UIMessage, index: number) => string;
};

const defaultFormatMessage = (message: UIMessage): string => {
  const roleLabel =
    message.role.charAt(0).toUpperCase() + message.role.slice(1);
  return `**${roleLabel}:** ${getMessageText(message)}`;
};

export const messagesToMarkdown = (
  messages: UIMessage[],
  formatMessage: (
    message: UIMessage,
    index: number,
  ) => string = defaultFormatMessage,
): string => messages.map((msg, i) => formatMessage(msg, i)).join("\n\n");

export const ConversationDownload = ({
  messages,
  filename = "conversation.md",
  formatMessage = defaultFormatMessage,
  className,
  children,
  ...props
}: ConversationDownloadProps) => {
  const handleDownload = useCallback(() => {
    const markdown = messagesToMarkdown(messages, formatMessage);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [messages, filename, formatMessage]);

  return (
    <IconButton
      className={clx("absolute top-4 right-4 rounded-full", className)}
      onClick={handleDownload}
      type="button"
      {...props}
    >
      {children ?? <ArrowDownTray className="size-4" />}
    </IconButton>
  );
};
