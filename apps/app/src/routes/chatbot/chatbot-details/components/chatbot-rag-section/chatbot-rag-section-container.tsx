import { Button, clx, Container, Heading } from "@medusajs/ui";
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
    <Container
      className={clx("divide-y p-0 border border-transparent", className)}
    >
      <div className="flex items-start justify-between px-6 py-4">
        <div>
          <Heading level="h3" className="text-lg font-semibold">
            {t("knowledgeBase.title")}
          </Heading>
        </div>
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
    </Container>
  );
}
