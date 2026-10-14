import { useUpdateChatbot } from "@/hooks/api";
import { Badge, Container, Switch, Text } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { SectionRow } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotSectionEditButton } from "./chatbot-section-edit-button";
import { ChatbotSectionHeader } from "./chatbot-section-header";

type ChatbotSettingsSectionProps = { item: ChatbotGetDetailResponseDto };

/** Chatbot flags the card flips straight from its rows. */
type ToggleableField = "typingIndicator" | "autoRead" | "guardrailEnabled";

/**
 * The switches owners reach for, in plain rows, plus the handoff and
 * follow-up rules; everything else is one Edit away.
 */
export const ChatbotSettingsSection: FC<ChatbotSettingsSectionProps> = ({
  item,
}) => {
  const { t } = useTranslation();
  const update = useUpdateChatbot();

  // The update merges, so a switch sends only the field it flips.
  const toggleRow = (field: ToggleableField, title: string) => (
    <SectionRow
      key={field}
      title={title}
      value={
        <div className="flex w-full justify-end">
          <Switch
            aria-label={title}
            checked={item[field] ?? false}
            disabled={update.isPending}
            onCheckedChange={(checked) =>
              update.mutate({ id: item.id, body: { [field]: checked } })
            }
          />
        </div>
      }
    />
  );
  const notSet = (
    <Text size="small" leading="compact" className="text-ui-fg-muted">
      {t("chatbot.details.messages.notSet")}
    </Text>
  );

  return (
    <Container className="divide-y p-0">
      <ChatbotSectionHeader
        title={t("chatbot.details.settings.title")}
        actions={<ChatbotSectionEditButton to="edit/settings" />}
      />
      {toggleRow("typingIndicator", t("chatbot.create.typingIndicator.label"))}
      {toggleRow("autoRead", t("chatbot.create.autoRead.label"))}
      {toggleRow("guardrailEnabled", t("chatbot.create.guardrailEnabled"))}
      <SectionRow
        title={t("chatbot.create.handoffKeywords")}
        value={
          item.handoffKeywords?.length
            ? item.handoffKeywords.map((keyword) => (
                <Badge key={keyword} size="2xsmall">
                  {keyword}
                </Badge>
              ))
            : notSet
        }
      />
      <SectionRow
        title={t("chatbot.create.followupRules")}
        value={
          item.followupRules?.trim() ? (
            <Text size="small" leading="compact" className="line-clamp-2">
              {item.followupRules}
            </Text>
          ) : (
            notSet
          )
        }
      />
      <SectionRow
        title={t("chatbot.create.model")}
        value={item.modelTextName}
      />
    </Container>
  );
};
