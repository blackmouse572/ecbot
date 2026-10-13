import { InformationCircle } from "@medusajs/icons";
import { Heading, Text, Tooltip, toast } from "@medusajs/ui";
import { ListSkeleton } from "@repo/ui/common-components";
import { useId } from "react";
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
  const headingId = useId();
  const { conversation, isPending, isError } = useConversation(conversationId);
  const { mutateAsync } = useUpdateConversationTimezone(conversationId);

  const agentZone = conversation?.chatbot?.timezone;
  const hint = agentZone
    ? t("conversations.customer.panel.timezone.hintWithZone", {
        zone: agentZone,
      })
    : t("conversations.customer.panel.timezone.hint");

  const heading = (
    <Heading
      id={headingId}
      level="h3"
      className="mb-2 flex items-center gap-1.5"
    >
      {t("conversations.customer.panel.timezone.title")}
      {conversation && (
        <Tooltip content={hint} maxWidth={260}>
          <InformationCircle
            aria-label={hint}
            className="text-ui-fg-muted h-3 w-3 cursor-help"
          />
        </Tooltip>
      )}
    </Heading>
  );

  if (isPending) {
    return (
      <>
        {heading}
        <ListSkeleton label={t("general.loading")} rowCount={1} />
      </>
    );
  }

  if (isError || !conversation) {
    return (
      <>
        {heading}
        <Text size="small" className="text-ui-fg-error">
          {t("general.loadFailed")}
        </Text>
      </>
    );
  }

  const save = (timezone: string | null) => {
    if (timezone === (conversation.timezone ?? null)) return;
    toast.promise(mutateAsync(timezone), {
      loading: t("conversations.customer.panel.timezone.toast.saving"),
      success: t("conversations.customer.panel.timezone.toast.updated"),
      error: t("conversations.customer.panel.timezone.toast.updateFailed"),
    });
  };

  return (
    <>
      {heading}
      {/* The selected zone stays the trigger's name; the heading describes it. */}
      <TimezoneSelect
        aria-describedby={headingId}
        value={conversation.timezone}
        onChange={save}
        defaultLabel={t("conversations.customer.panel.timezone.followAgent")}
      />
    </>
  );
}
