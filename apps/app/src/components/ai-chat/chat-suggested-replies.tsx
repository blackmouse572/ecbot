import { Button, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useAIChat } from "./ai-chat-provider";

type Props = {
  replies: string[];
  /** Enter transition shared with the bubbles, staggered after the greeting. */
  enterClassName: string;
};

// Quick replies under the chat input: tapping one sends it as the visitor's
// first message. They go away once the conversation starts.
export const ChatSuggestedReplies: FC<Props> = ({
  replies,
  enterClassName,
}) => {
  const { onSubmit, status, messages } = useAIChat();
  const busy = status === "submitted" || status === "streaming";
  if (messages.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
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
