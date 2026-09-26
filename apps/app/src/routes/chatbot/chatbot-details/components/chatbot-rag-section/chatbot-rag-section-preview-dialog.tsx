import { useKnowledgeItem } from "@/hooks/api/knowledge-base";
import { formatFileSize } from "@/utils";
import { FocusModal, Text } from "@medusajs/ui";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { Skeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { KnowledgeItemContentActionType } from "@/routes/knowledge-base/knowledge-item-details/components/knowlege-item-content-action-type";

type ChatbotRAGSectionPreviewDialogProps = {
  knowledgeBaseId: string;
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Default export so the chatbot RAG section can load it with React.lazy.
export default function ChatbotRAGSectionPreviewDialog({
  knowledgeBaseId,
  itemId,
  open,
  onOpenChange,
}: ChatbotRAGSectionPreviewDialogProps) {
  const { t } = useTranslation();
  const { item, isLoading, isError } = useKnowledgeItem(
    knowledgeBaseId,
    itemId,
  );

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content aria-describedby={undefined}>
        <FocusModal.Header>
          <div className="flex w-full items-center justify-between gap-x-4">
            <div className="min-w-0">
              <FocusModal.Title className="truncate">
                {item?.title ?? t("actions.preview")}
              </FocusModal.Title>
              {item && (
                <Text size="small" className="text-ui-fg-muted">
                  {t(`knowledgeItem.type.${item.type}`, item.type)}
                </Text>
              )}
            </div>
            {item && <KnowledgeItemContentActionType item={item} />}
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col overflow-hidden p-6">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : isError || !item ? (
            <PreviewMessage>{t("knowledge_item.preview_error")}</PreviewMessage>
          ) : (
            <PreviewContent item={item} />
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}

function PreviewContent({ item }: { item: KnowledgeItemResponseDto }) {
  const { t } = useTranslation();

  if (item.type === "FILE") {
    const { attachment } = item;
    if (attachment?.mime === "application/pdf" && attachment.cdnUrl) {
      return (
        <iframe
          src={attachment.cdnUrl}
          title={item.title}
          className="h-full w-full flex-1 rounded-md border border-ui-border-base"
        />
      );
    }
    return (
      <PreviewMessage>
        <span>{t("knowledge_item.preview_unsupported")}</span>
        {attachment && (
          <span className="text-ui-fg-muted">
            {attachment.extension.toUpperCase()},{" "}
            {formatFileSize(attachment.size)}
          </span>
        )}
      </PreviewMessage>
    );
  }

  if (!item.content) {
    return <PreviewMessage>{t("knowledge_item.preview_empty")}</PreviewMessage>;
  }

  return (
    <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md bg-ui-bg-subtle p-4 font-sans text-sm text-ui-fg-base">
      {item.content}
    </pre>
  );
}

function PreviewMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-y-1 text-center text-sm text-ui-fg-subtle">
      {children}
    </div>
  );
}
