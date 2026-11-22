import { Button, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useAIChat } from "./ai-chat-provider";

type Props = {
  replies: string[];
  /** Enter transition shared with the bubbles, staggered after the greeting. */
  enterClassName: string;
};

// Quick replies under the greeting: tapping one sends it as the visitor's
// first message.
export const ChatSuggestedReplies: FC<Props> = ({
  replies,
  enterClassName,
}) => {
  const { onSubmit, status } = useAIChat();
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-wrap justify-end gap-2">
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
