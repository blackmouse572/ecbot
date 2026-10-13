import { Text, toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import {
  useConversation,
  useUpdateConversationTimezone,
} from "@/hooks/api/conversations";
import { TimezoneSelect } from "@/routes/chatbot/components/timezone-select";

interface Props {
  conversationId: string;
}

// Times the customer states ("call me at 9") are read in this zone; the
// agent's own timezone still decides opening hours.
export function TimezoneSection({ conversationId }: Props) {
  const { t } = useTranslation();
  const { conversation, isPending, isError } = useConversation(conversationId);
  const { mutateAsync } = useUpdateConversationTimezone(conversationId);

  if (isPending) return null;

  if (isError || !conversation) {
    return (
      <Text size="small" className="text-ui-fg-error">
        {t("general.loadFailed")}
      </Text>
    );
  }

  const agentZone = conversation.chatbot?.timezone;

  const save = (timezone: string | null) => {
    if (timezone === (conversation.timezone ?? null)) return;
    toast.promise(mutateAsync(timezone), {
      loading: t("conversations.customer.panel.toast.saving"),
      success: t("conversations.customer.panel.toast.updated"),
      error: t("conversations.customer.panel.toast.updateFailed"),
    });
  };

  return (
    <div className="flex flex-col gap-y-2">
      <TimezoneSelect
        aria-label={t("conversations.customer.panel.timezone.title")}
        value={conversation.timezone}
        onChange={save}
        defaultLabel={t("conversations.customer.panel.timezone.followAgent")}
      />
      <Text size="small" className="text-ui-fg-subtle">
        {agentZone
          ? t("conversations.customer.panel.timezone.hintWithZone", {
              zone: agentZone,
            })
          : t("conversations.customer.panel.timezone.hint")}
      </Text>
    </div>
  );
}
