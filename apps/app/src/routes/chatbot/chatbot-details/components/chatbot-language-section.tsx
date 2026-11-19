import { languageName } from "@/libs/language-name";
import { Container } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { SectionRow } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotSectionEditButton } from "./chatbot-section-edit-button";
import { ChatbotSectionHeader } from "./chatbot-section-header";

type Props = { item: ChatbotGetDetailResponseDto };

/** The languages the agent replies in and the clock it reads the time from. */
export const ChatbotLanguageSection: FC<Props> = ({ item }) => {
  const { t, i18n } = useTranslation();
  const languageLabel = (code: string) => languageName(code, i18n.language);

  return (
    <Container className="divide-y p-0">
      <ChatbotSectionHeader
        title={t("chatbot.details.language.title")}
        actions={<ChatbotSectionEditButton to="edit" />}
      />
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
    </Container>
  );
};
