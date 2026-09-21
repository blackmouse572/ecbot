import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Button, Drawer, Text, toast } from "@medusajs/ui";
import { Combobox } from "@repo/ui/common-components";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  useKnowledgeBases,
  useKnowledgeItems,
  useLinkKnowledgeItemToChatbot,
} from "@/hooks/api/knowledge-base";
import { KnowledgeMetadataSection } from "../../../../knowledge-base/knowledge-item-details/components";
import { PlusMini } from "@medusajs/icons";

type ChatbotRAGSectionAddDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  linkedItemIds?: string[];
};

export function ChatbotRAGSectionAddDrawer({
  isOpen,
  onClose,
  chatbotId,
  linkedItemIds = [],
}: ChatbotRAGSectionAddDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch all knowledge bases
  const { knowledgeBases } = useKnowledgeBases();

  // Fetch items for selected knowledge base
  const { items: knowledgeItems, isLoading } = useKnowledgeItems(
    knowledgeBases?.[0].id || "",
    {},
    {
      enabled: !!knowledgeBases,
    },
  );

  // Link mutation
  const linkMutation = useLinkKnowledgeItemToChatbot(chatbotId);

  // Filter items by search and exclude already linked
  const filteredItems = useMemo(() => {
    return (knowledgeItems || []).filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);
      const isNotLinked = !linkedItemIds.includes(item.id);
      return matchesSearch && isNotLinked;
    });
  }, [knowledgeItems, searchQuery, linkedItemIds]);

  const handleAddItem = useCallback(async () => {
    if (!selectedItemId) {
      toast.error(t("knowledgeBase.error.selectItem", "Please select an item"));
      return;
    }

    try {
      await linkMutation.mutateAsync(selectedItemId);
      toast.success(
        t(
          "knowledgeBase.success.linkedItem",
          "Knowledge item linked successfully",
        ),
      );
      onClose();
      setSelectedItemId("");
      setSearchQuery("");
    } catch (error) {
      toast.error(
        t("knowledgeBase.error.linkFailed", "Failed to link knowledge item"),
      );
    }
  }, [selectedItemId, linkMutation, onClose, t]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {t("knowledgeBase.link.title", "Add Knowledge Item")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6">
          {/* Knowledge Items Combobox */}
          <div className="flex flex-col gap-2">
            <Text size="small">
              {t("knowledgeBase.selectItem", "Select Item")}
            </Text>
            <Combobox
              value={selectedItemId}
              searchValue={searchQuery}
              options={filteredItems.map((item) => ({
                label: item.title,
                value: item.id,
              }))}
              onChange={(v) => v && setSelectedItemId(v)}
              onSearchValueChange={setSearchQuery}
            />
          </div>

          {/* Selected Item Preview */}
          {selectedItemId && filteredItems.length > 0 && (
            <KnowledgeMetadataSection
              item={filteredItems.find((item) => item.id === selectedItemId)!}
              className="border-b-ui-border-base border bg-ui-bg-component shadow-none"
            />
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            variant="transparent"
            onClick={() =>
              navigate(
                `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBases?.[0]?.id}/item/create`,
              )
            }
          >
            <PlusMini />
            {t("actions.create")}
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Drawer.Close asChild>
              <Button variant="secondary">{t("actions.cancel")}</Button>
            </Drawer.Close>
            <Button
              onClick={handleAddItem}
              isLoading={linkMutation.isPending}
              disabled={!selectedItemId}
            >
              {t("actions.add")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
