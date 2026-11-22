import { Button, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useAIChat } from "./ai-chat-provider";

type Props = {
  replies: string[];
  /** Enter transition shared with the bubbles, staggered after the greeting. */
  enterClassName: string;
};

// Quick replies just above the chat input: tapping one sends it as the visitor's
// first message. They go away once the conversation starts.
export const ChatSuggestedReplies: FC<Props> = ({
  replies,
  enterClassName,
}) => {
  const { onSubmit, status, messages } = useAIChat();
  const busy = status === "submitted" || status === "streaming";
  if (messages.length) return null;

  return (
    <div className="bg-ui-bg-base relative -mt-px flex flex-wrap gap-2 border-b-0 px-4 pt-1 pb-3">
      {replies.map((reply, index) => (
        <Button
          key={reply}
          type="button"
          size="small"
          variant="secondary"
          className={clx("rounded-full", enterClassName)}
          style={{ transitionDelay: `${120 + index * 50}ms` }}
          disabled={busy}
          onClick={() => void onSubmit(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  );
};
