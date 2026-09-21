import { Button, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import {
  useCancelFollowup,
  useConversationFollowups,
  type FollowupListResponseDto,
} from "@/hooks/api/followups";

interface Props {
  conversationId: string;
  onViewMessage?: (messageId: string) => void;
}

export function FollowupsSection({ conversationId, onViewMessage }: Props) {
  const { t } = useTranslation();
  const { followups, isPending } = useConversationFollowups(conversationId);
  const cancel = useCancelFollowup();

  if (isPending) return null;

  if (followups.length === 0) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        {t("conversations.customer.panel.followups.empty")}
      </Text>
    );
  }

  return (
    <ul className="flex flex-col gap-y-2">
      {followups.map((followup) => (
        <FollowupItem
          key={followup.followupId}
          followup={followup}
          onViewMessage={onViewMessage}
          onCancel={() => cancel.mutate(followup.followupId)}
          isCancelling={cancel.isPending}
        />
      ))}
    </ul>
  );
}

function FollowupItem({
  followup,
  onViewMessage,
  onCancel,
  isCancelling,
}: {
  followup: FollowupListResponseDto;
  onViewMessage?: (messageId: string) => void;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const { t } = useTranslation();

  return (
    <li className="border-ui-border-base bg-ui-bg-base flex flex-col gap-y-1.5 rounded border px-2 py-1.5">
      <Text size="small" weight="plus">
        {followup.reason}
      </Text>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("followups.list.firesInMinutes", { count: followup.firesInMinutes })}
      </Text>
      <div className="flex gap-x-2">
        <Button
          type="button"
          variant="transparent"
          size="small"
          disabled={!followup.triggerMessageId}
          onClick={() =>
            followup.triggerMessageId &&
            onViewMessage?.(followup.triggerMessageId)
          }
        >
          {"→ "}
          {t("conversations.customer.panel.followups.viewMessage")}
        </Button>
        <Button
          type="button"
          variant="transparent"
          size="small"
          disabled={isCancelling}
          onClick={onCancel}
        >
          {t("conversations.customer.panel.followups.cancel")}
        </Button>
      </div>
    </li>
  );
}
