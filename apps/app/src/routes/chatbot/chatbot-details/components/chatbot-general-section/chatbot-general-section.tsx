import {
  useToggleChatbotActivate,
  type ChatbotGetDetailResponseDto,
} from "@/hooks/api";
import { useDate } from "@/hooks/use-date";
import { ChatbotActions } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-actions";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { ChatbotTypeCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-cell";
import { useUISound } from "@/modules/sound";
import { Container, Switch, Text } from "@medusajs/ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotSectionEditButton } from "../chatbot-section-edit-button";

type ChatbotGeneralSectionProps = {
  item: ChatbotGetDetailResponseDto;
  /** The page's tab list, under the title. */
  children?: ReactNode;
};

/** The page title card: who the agent is, whether it runs, the page tabs. */
export const ChatbotGeneralSection = ({
  item,
  children,
}: ChatbotGeneralSectionProps) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const toggle = useToggleChatbotActivate();
  const playSound = useUISound();
  const turningOn = item.status === "inactive";

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div className="flex min-w-0 flex-col gap-y-1">
          <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {t("chatbot.details.general.summary", {
              count: item.accounts?.length ?? 0,
            })}
            {/* Null until the first edit; never show it as 1970. */}
            {item.updatedAt &&
              ` · ${t("chatbot.details.general.updatedAt", {
                date: getFullDate(new Date(item.updatedAt)),
              })}`}
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-x-2">
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
      {children && <div className="px-6 py-3">{children}</div>}
    </Container>
  );
};
