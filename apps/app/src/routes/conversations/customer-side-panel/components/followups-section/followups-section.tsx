import { Button, Text } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { IconCalendarTime } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  useCancelFollowup,
  useConversationFollowups,
  useCustomerFollowups,
  type FollowupListResponseDto,
} from "@/hooks/api/followups";
import { ListSkeleton } from "@repo/ui/common-components";

interface Props {
  conversationId: string;
  onViewMessage?: (messageId: string) => void;
}

export function FollowupsSection({ conversationId, onViewMessage }: Props) {
  const query = useConversationFollowups(conversationId);

  return (
    <FollowupList
      {...query}
      onViewMessage={(followup) =>
        followup.triggerMessageId && onViewMessage?.(followup.triggerMessageId)
      }
    />
  );
}

/** The customer page: reminders still to send, each opening its conversation. */
export function CustomerFollowupsSection({
  customerId,
  onViewMessage,
}: {
  customerId: string;
  onViewMessage: (followup: FollowupListResponseDto) => void;
}) {
  const query = useCustomerFollowups(customerId);

  return <FollowupList {...query} onViewMessage={onViewMessage} />;
}

function FollowupList({
  followups,
  isPending,
  isError,
  onViewMessage,
}: {
  followups: FollowupListResponseDto[];
  isPending: boolean;
  isError: boolean;
  onViewMessage: (followup: FollowupListResponseDto) => void;
}) {
  const { t } = useTranslation();
  const cancel = useCancelFollowup();

  if (isPending)
    return <ListSkeleton label={t("general.loading")} rowCount={2} />;

  if (isError) {
    return (
      <Text size="small" className="text-ui-fg-error">
        {t("general.loadFailed")}
      </Text>
    );
  }

  if (followups.length === 0) {
    return (
      <NoRecords
        size="small"
        title={t("conversations.customer.panel.followups.empty")}
        message={t("conversations.customer.panel.followups.emptyHint")}
        icon={<IconCalendarTime />}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-y-2">
      {followups.map((followup) => (
        <FollowupItem
          key={followup.followupId}
          followup={followup}
          onViewMessage={() => onViewMessage(followup)}
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
  onViewMessage: () => void;
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
          onClick={onViewMessage}
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
