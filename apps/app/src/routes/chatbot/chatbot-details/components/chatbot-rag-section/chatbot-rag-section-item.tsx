import {
  KB_TYPE_CONFIG,
  KB_TYPE_ICON_COMPONENTS,
} from "@/routes/knowledge-base/constants";
import { KnowledgeItemStatusCell } from "@/routes/knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-status-cell";
import { clx, Container, Text, IconButton } from "@medusajs/ui";
import type { ChatbotKnowledgeItemResponseDto } from "@repo/client";
import { IconEye, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type ChatbotKnowledgeItemProps = {
  item: ChatbotKnowledgeItemResponseDto;
  className?: string;
  onUnlink?: (id: string) => void;
  onPreview?: (item: ChatbotKnowledgeItemResponseDto) => void;
  isUnlinking?: boolean;
};

/** A linked knowledge item, with the same type icon and status badge as the Knowledge Base list. */
export function ChatbotRAGSectionItem({
  item,
  className,
  onUnlink,
  onPreview,
  isUnlinking,
}: ChatbotKnowledgeItemProps) {
  const { t } = useTranslation();
  const { knowledgeItem } = item;
  const name = knowledgeItem?.title || t("knowledgeItem.untitled", "Untitled");
  const typeConfig = KB_TYPE_CONFIG[knowledgeItem?.type] ?? KB_TYPE_CONFIG.TEXT;
  const TypeIcon =
    KB_TYPE_ICON_COMPONENTS[
      typeConfig.icon as keyof typeof KB_TYPE_ICON_COMPONENTS
    ];

  return (
    <Container
      className={clx(
        "relative flex flex-col items-start justify-between gap-4 bg-ui-bg-component p-4",
        className,
      )}
    >
      <div className="w-full flex items-start gap-3">
        <TypeIcon
          className="text-ui-fg-subtle flex-shrink-0 mt-0.5"
          size={20}
          strokeWidth={1.5}
        />
        <div className="flex-1 min-w-0">
          <Text className="font-semibold text-sm line-clamp-2" weight="plus">
            {name}
          </Text>
          <Text className="text-ui-fg-muted text-xs">{typeConfig.label}</Text>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <KnowledgeItemStatusCell
          status={knowledgeItem?.status}
          errorMessage={knowledgeItem?.errorMessage}
          processedAt={knowledgeItem?.processedAt}
        />

        <div className="flex items-center gap-x-1">
          <IconButton
            onClick={() => onPreview?.(item)}
            variant="transparent"
            size="small"
            aria-label={t("actions.preview")}
          >
            <IconEye size={16} />
          </IconButton>
          <IconButton
            onClick={() => onUnlink?.(knowledgeItem?.id)}
            isLoading={isUnlinking}
            disabled={isUnlinking}
            variant="transparent"
            size="small"
            aria-label={t("actions.unlink", "Unlink")}
          >
            <IconTrash size={16} />
          </IconButton>
        </div>
      </div>
    </Container>
  );
}
