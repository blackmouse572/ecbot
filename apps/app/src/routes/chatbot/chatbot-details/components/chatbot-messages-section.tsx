import { Container, Text } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { SectionRow } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  CHATBOT_EDIT_SECTIONS,
  CHATBOT_MESSAGE_FIELDS,
  CHATBOT_MESSAGE_WHEN_KEYS,
} from "../../constants";
import { ChatbotSectionEditButton } from "./chatbot-section-edit-button";
import { ChatbotSectionHeader } from "./chatbot-section-header";

type ChatbotMessagesSectionProps = { item: ChatbotGetDetailResponseDto };

/** The fixed messages the agent sends, each labelled with when it goes out. */
export const ChatbotMessagesSection: FC<ChatbotMessagesSectionProps> = ({
  item,
}) => {
  const { t } = useTranslation();

  return (
    <Container className="divide-y p-0">
      <ChatbotSectionHeader
        title={t("chatbot.details.messages.title")}
        description={t("chatbot.details.messages.description")}
        actions={
          <ChatbotSectionEditButton to={CHATBOT_EDIT_SECTIONS.messages.path} />
        }
      />
      {CHATBOT_MESSAGE_FIELDS.map((field) => {
        const message = item[field]?.trim();
        return (
          <SectionRow
            key={field}
            title={
              <span className="flex flex-col gap-y-0.5">
                {t(`chatbot.create.${field}`)}
                <span className="txt-compact-xsmall text-ui-fg-muted font-normal">
                  {t(CHATBOT_MESSAGE_WHEN_KEYS[field])}
                </span>
              </span>
            }
            value={
              <Text
                size="small"
                leading="compact"
                className={
                  message
                    ? "whitespace-pre-line text-ui-fg-base"
                    : "text-ui-fg-muted"
                }
              >
                {message || t("chatbot.details.messages.notSet")}
              </Text>
            }
          />
        );
      })}
    </Container>
  );
};
