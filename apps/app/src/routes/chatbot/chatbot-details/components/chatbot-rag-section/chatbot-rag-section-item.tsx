import {
  clx,
  Container,
  StatusBadge,
  Text,
  Tooltip,
  IconButton,
} from "@medusajs/ui";
import type { ChatbotKnowledgeItemResponseDto } from "@repo/client";
import {
  IconEye,
  IconFileTypePdf,
  IconInvoice,
  IconTrash,
  type IconProps,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type ChatbotKnowledgeItemProps = {
  item: ChatbotKnowledgeItemResponseDto;
  className?: string;
  onUnlink?: (id: string) => void;
  onPreview?: (item: ChatbotKnowledgeItemResponseDto) => void;
  isUnlinking?: boolean;
};

export const KNOWLEDGE_ITEM_STATUS_BADGE_COLOR: Record<string, A> = {
  draft: "grey",
  processing: "blue",
  processed: "green",
  failed: "red",
};

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
  const type = knowledgeItem?.type || "TEXT";

  return (
    <Container
      className={clx(
        "relative flex flex-col items-start justify-between gap-4 bg-ui-bg-component p-4",
        className,
      )}
    >
      <div className="w-full flex items-start gap-3">
        <ChatbotRAGSectionItemIcon
          className="text-ui-fg-subtle flex-shrink-0 mt-0.5"
          type={type}
          size={20}
          strokeWidth={1.5}
        />
        <div className="flex-1 min-w-0">
          <Text className="font-semibold text-sm line-clamp-2" weight="plus">
            {name}
          </Text>
          <Text className="text-ui-fg-muted text-xs">
            {t(`knowledgeItem.type.${type}`, type)}
          </Text>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <Tooltip
          content={t(`knowledgeItem.status.${knowledgeItem?.status}`, {
            defaultValue: knowledgeItem?.status,
          })}
        >
          <StatusBadge
            className="pr-0"
            color={
              KNOWLEDGE_ITEM_STATUS_BADGE_COLOR[
                knowledgeItem?.status || "draft"
              ]
            }
          />
        </Tooltip>

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

export function ChatbotRAGSectionItemIcon(props: { type: string } & IconProps) {
  const typeUpper = props.type?.toUpperCase() || "TEXT";

  switch (typeUpper) {
    case "FILE":
      return <IconFileTypePdf {...props} />;
    case "URL":
      return <IconInvoice {...props} />;
    case "TEXT":
    default:
      return <IconInvoice {...props} />;
  }
}
