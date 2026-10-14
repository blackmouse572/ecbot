import { Button, clx, Text } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type ChatbotRAGSectionProps = {
  item: ChatbotGetDetailResponseDto;
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onAddClick?: () => void;
};

export function ChatbotRAGSectionContainer({
  className,
  children,
  actions,
  onAddClick,
}: ChatbotRAGSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={clx("divide-y", className)}>
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">
          {t("chatbot.details.capabilities.knowledgeDescription")}
        </Text>
        <div className="flex items-center gap-2">
          {actions}
          {onAddClick && (
            <Button variant="secondary" size="small" onClick={onAddClick}>
              <IconPlus size={16} />
              {t("actions.add")}
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
