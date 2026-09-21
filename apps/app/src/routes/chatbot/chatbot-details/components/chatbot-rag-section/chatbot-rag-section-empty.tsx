import { clx, Text } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { IconBooks } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type ChatbotRAGSectionProps = {
  item: ChatbotGetDetailResponseDto;
  className?: string;
};

export function ChatbotRAGSectionEmpty({
  item: _,
  className,
}: ChatbotRAGSectionProps) {
  const { t } = useTranslation();
  return (
    <div
      className={clx(
        "flex flex-col gap-4 items-center justify-center py-12",
        className,
      )}
    >
      <div className="rounded-full bg-ui-bg-field p-6">
        <IconBooks size={64} className="text-ui-fg-muted" />
      </div>
      <div className="space-y-1 text-center">
        <Text weight="plus" size="xlarge">
          {t("knowledgeBase.empty.title")}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {t("knowledgeBase.empty.description")}
        </Text>
      </div>
    </div>
  );
}
