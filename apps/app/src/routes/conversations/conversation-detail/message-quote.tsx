import { ArrowUturnLeft } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { MessageReplyToResponseDto } from "@/hooks/api/conversations";

interface Props {
  replyTo: MessageReplyToResponseDto;
  align: "start" | "end";
}

/** The message a customer's reply quotes, drawn like Messenger: a "replied
 *  to" line, then the quoted text in a faded bubble the reply tucks over.
 *  Links to the quoted message when we have it. */
export const MessageQuote: FC<Props> = ({ replyTo, align }) => {
  const { t } = useTranslation();
  const whose = t(
    replyTo.text === undefined
      ? "conversations.quote.unknown"
      : replyTo.fromCustomer
        ? "conversations.quote.theirs"
        : "conversations.quote.yours",
  );
  const bubbleClass =
    "bg-ui-bg-switch-off text-ui-fg-subtle txt-small max-w-[80%] rounded-2xl px-3 pt-2 pb-6";

  return (
    <div
      className={clx(
        "flex flex-col gap-1",
        align === "end" ? "items-end" : "items-start",
        // The reply's bubble overlaps the quote's bottom edge.
        replyTo.text && "-mb-6",
      )}
    >
      <span className="txt-compact-xsmall text-ui-fg-muted flex items-center gap-1">
        <ArrowUturnLeft />
        {whose}
      </span>
      {replyTo.text &&
        (replyTo.messageId ? (
          <a
            href={`#msg-${replyTo.messageId}`}
            className={clx(bubbleClass, "hover:bg-ui-bg-switch-off-hover")}
          >
            <span className="line-clamp-2">{replyTo.text}</span>
          </a>
        ) : (
          <div className={bubbleClass}>
            <span className="line-clamp-2">{replyTo.text}</span>
          </div>
        ))}
    </div>
  );
};
