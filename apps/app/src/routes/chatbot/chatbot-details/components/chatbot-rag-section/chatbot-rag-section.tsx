import {
  useChatbotKnowledgeItems,
  useKnowledgeBases,
  useUnlinkKnowledgeItemFromChatbot,
} from "@/hooks/api/knowledge-base";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { withOriginAgent } from "@/utils/origin-agent";
import { clx, toast, usePrompt } from "@medusajs/ui";
import type {
  ChatbotGetDetailResponseDto,
  KnowledgeItemResponseDto,
} from "@repo/client";
import { ListSkeleton, NoRecords } from "@repo/ui/common-components";
import { IconBooks } from "@tabler/icons-react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatbotRAGSectionContainer } from "./chatbot-rag-section-container";
import { ChatbotRAGSectionItem } from "./chatbot-rag-section-item";
import { ChatbotRAGSectionAddDrawer } from "./chatbot-rag-section-add-drawer";

const ChatbotRAGSectionPreviewDialog = lazy(
  () => import("./chatbot-rag-section-preview-dialog"),
);

type ChatbotRAGSectionProps = {
  item: ChatbotGetDetailResponseDto;
  className?: string;
};

export function ChatbotRAGSection({ item, className }: ChatbotRAGSectionProps) {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewItem, setPreviewItem] =
    useState<KnowledgeItemResponseDto | null>(null);

  // Fetch linked knowledge items
  const { items, isLoading } = useChatbotKnowledgeItems(item.id);
  const { workspaceSlug } = useWorkspaceParams();
  // The section works on the workspace's first knowledge base; without one
  // there is nowhere to create an item, so the empty state offers Add only.
  const { knowledgeBases } = useKnowledgeBases();
  const knowledgeBaseId = knowledgeBases?.[0]?.id;

  // Unlink mutation
  const unlinkMutation = useUnlinkKnowledgeItemFromChatbot(item.id);

  const linkedItemIds = items
    ?.map((item) => item.knowledgeItem?.id)
    .filter(Boolean) as string[];

  const prompt = usePrompt();
  const handleUnlink = async (itemId: string) => {
    const confirm = await prompt({
      title: t("knowledgeBase.unlink.title", "Unlink Item"),
      description: t(
        "knowledgeBase.unlink.description",
        "Are you sure you want to unlink this knowledge item? This action cannot be undone.",
      ),
      confirmText: t("actions.unlink", "Unlink"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    });

    if (!confirm) {
      return;
    }

    try {
      await unlinkMutation.mutateAsync(itemId);
      toast.success(
        t(
          "knowledgeBase.success.unlinked",
          "Knowledge item unlinked successfully",
        ),
      );
    } catch (error) {
      toast.error(
        t(
          "knowledgeBase.error.unlinkFailed",
          "Failed to unlink knowledge item",
        ),
      );
    }
  };

  if (isLoading) {
    return <ListSkeleton label={t("general.loading")} className="px-6 py-4" />;
  }

  if (items?.length === 0) {
    return (
      <ChatbotRAGSectionContainer
        item={item}
        className={clx("divide-y p-0", className)}
        onAddClick={() => setIsDrawerOpen(true)}
      >
        <NoRecords
          title={t("knowledgeBase.empty.title")}
          message={t("knowledgeBase.empty.description")}
          action={
            knowledgeBaseId
              ? {
                  to: withOriginAgent(
                    `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/create`,
                    item.id,
                  ),
                  label: t("actions.createNew"),
                }
              : {
                  onClick: () => setIsDrawerOpen(true),
                  label: t("actions.add"),
                }
          }
          icon={<IconBooks />}
        />
        <ChatbotRAGSectionAddDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          chatbotId={item.id}
          linkedItemIds={linkedItemIds}
        />
      </ChatbotRAGSectionContainer>
    );
  }

  return (
    <>
      <ChatbotRAGSectionContainer
        item={item}
        className={clx("divide-y p-0", className)}
        onAddClick={() => setIsDrawerOpen(true)}
      >
        <section className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {items?.map((item) => (
            <ChatbotRAGSectionItem
              key={item.id}
              item={item}
              onUnlink={handleUnlink}
              onPreview={(linked) => setPreviewItem(linked.knowledgeItem)}
              isUnlinking={unlinkMutation.isPending}
            />
          ))}
        </section>
      </ChatbotRAGSectionContainer>
      <ChatbotRAGSectionAddDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chatbotId={item.id}
        linkedItemIds={linkedItemIds}
      />
      {previewItem && (
        <Suspense fallback={null}>
          <ChatbotRAGSectionPreviewDialog
            open
            knowledgeBaseId={previewItem.knowledgeBaseId}
            itemId={previewItem.id}
            onOpenChange={(open) => !open && setPreviewItem(null)}
          />
        </Suspense>
      )}
    </>
  );
}
