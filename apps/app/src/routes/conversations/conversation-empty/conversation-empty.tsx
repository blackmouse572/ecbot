import { ChatBubbleLeftRight } from "@medusajs/icons";
import { Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

export function ConversationEmpty() {
  const { t } = useTranslation();
  return (
    <div className="text-ui-fg-subtle flex flex-1 flex-col items-center justify-center gap-y-3 p-8 text-center">
      <div className="bg-ui-bg-component flex h-12 w-12 items-center justify-center rounded-full">
        <ChatBubbleLeftRight />
      </div>
      <Heading level="h2">{t("conversations.detail.empty.title")}</Heading>
      <Text size="small" className="text-ui-fg-muted max-w-sm">
        {t("conversations.detail.empty.description")}
      </Text>
    </div>
  );
}
