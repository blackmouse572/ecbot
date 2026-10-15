import { ArrowUturnLeft } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { MessageReplyToResponseDto } from "@/hooks/api/conversations";

interface Props {
  replyTo: MessageReplyToResponseDto;
  align: "start" | "end";
}

/** The message a customer's reply quotes, shown above the reply. Links to
 *  the quoted message when we have it. */
export const MessageQuote: FC<Props> = ({ replyTo, align }) => {
  const { t } = useTranslation();
  const whose = t(
    replyTo.text === undefined
      ? "conversations.quote.unknown"
      : replyTo.fromCustomer
        ? "conversations.quote.theirs"
        : "conversations.quote.yours",
  );
  const body = (
    <>
      <span className="txt-compact-xsmall text-ui-fg-muted flex items-center gap-1">
        <ArrowUturnLeft />
        {whose}
      </span>
      {replyTo.text && (
        <span className="txt-compact-small text-ui-fg-subtle line-clamp-2">
          {replyTo.text}
        </span>
      )}
    </>
  );
  const className = clx(
    "border-ui-border-strong bg-ui-bg-subtle flex max-w-[80%] flex-col gap-0.5 rounded-lg border-l-2 px-3 py-1.5",
    align === "end" ? "self-end" : "self-start",
  );

  return replyTo.messageId ? (
    <a
      href={`#msg-${replyTo.messageId}`}
      className={clx(className, "hover:bg-ui-bg-subtle-hover")}
    >
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
};
