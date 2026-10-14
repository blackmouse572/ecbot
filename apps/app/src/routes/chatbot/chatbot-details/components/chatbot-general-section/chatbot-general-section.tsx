import {
  useToggleChatbotActivate,
  type ChatbotGetDetailResponseDto,
} from "@/hooks/api";
import { useDate } from "@/hooks/use-date";
import { ChatbotActions } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-actions";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { ChatbotStatusCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-status-cell";
import { ChatbotTypeCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-cell";
import { CHATBOT_LANGUAGES } from "@/routes/chatbot/constants";
import { useUISound } from "@/modules/sound";
import { Container, Switch, Text } from "@medusajs/ui";
import { SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { AccountList } from "../account-list";
import { ChatbotSectionEditButton } from "../chatbot-section-edit-button";

type ChatbotGeneralSectionProps = {
  item: ChatbotGetDetailResponseDto;
};

const languageLabel = (code: string) =>
  CHATBOT_LANGUAGES[code as keyof typeof CHATBOT_LANGUAGES] ?? code;

/** The page title card: who the agent is, whether it runs, where it answers. */
export const ChatbotGeneralSection = ({ item }: ChatbotGeneralSectionProps) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const toggle = useToggleChatbotActivate();
  const playSound = useUISound();
  const turningOn = item.status === "inactive";

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* The name is the page title; the cell's avatar keeps a div here. */}
          <ChatbotNameCell
            role="heading"
            aria-level={1}
            name={item.name}
            avatar={item.avatar}
            size="large"
            className="[&_p]:font-medium"
          />
          <ChatbotTypeCell item={item} />
          <ChatbotStatusCell item={item} />
        </div>
        <div className="flex items-center gap-x-2">
          <Switch
            aria-label={t("fields.status")}
            checked={!turningOn}
            disabled={toggle.isPending}
            onCheckedChange={() =>
              toggle.mutate(
                { id: item.id, active: turningOn },
                { onSuccess: () => turningOn && playSound("toggle-on") },
              )
            }
          />
          <ChatbotSectionEditButton to="edit" />
          <ChatbotActions item={item} showEdit={false} />
        </div>
      </div>
      <SectionRow
        title={t("chatbot.create.primaryLanguage")}
        value={languageLabel(item.primaryLanguage)}
      />
      <SectionRow
        title={t("chatbot.create.deferedLanguage")}
        value={
          item.deferedLanguage ? languageLabel(item.deferedLanguage) : null
        }
      />
      <SectionRow
        title={t("chatbot.create.timezone")}
        value={item.timezone ?? t("chatbot.create.timezoneDefault")}
      />
      <AccountList item={item} accounts={item.accounts} />
      <div className="flex flex-wrap justify-between gap-2 px-6 py-3">
        <Text size="xsmall" className="text-ui-fg-muted">
          {t("chatbot.details.general.createdAt", {
            date: getFullDate(new Date(item.createdAt)),
          })}
        </Text>
        {/* Null until the first edit; never show it as 1970. */}
        {item.updatedAt && (
          <Text size="xsmall" className="text-ui-fg-muted">
            {t("chatbot.details.general.updatedAt", {
              date: getFullDate(new Date(item.updatedAt)),
            })}
          </Text>
        )}
      </div>
    </Container>
  );
};
