import { useBatchTagKnowledgeItems } from "@/hooks/api/knowledge-base";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { Button, Drawer, Text } from "@medusajs/ui";
import { ChipGroup } from "@repo/ui/common-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KnowledgeItemEditTag } from "../../../knowledge-item-edit/components/knowledge-item-edit-tags";

type KnowledgeBaseBatchTagDrawerProps = {
  knowledgeBaseId: string;
  /** Items to tag. The drawer is open while this is set. */
  itemIds: string[] | null;
  onClose: () => void;
};

export function KnowledgeBaseBatchTagDrawer({
  knowledgeBaseId,
  itemIds,
  onClose,
}: KnowledgeBaseBatchTagDrawerProps) {
  const { t } = useTranslation();
  const notifyBatchResult = useBatchResultToast();
  const batchTag = useBatchTagKnowledgeItems(knowledgeBaseId);
  const [tags, setTags] = useState<string[]>([]);

  const close = () => {
    setTags([]);
    onClose();
  };

  const handleSave = async () => {
    if (!itemIds?.length || !tags.length) return;
    notifyBatchResult(await batchTag.mutateAsync({ ids: itemIds, tags }));
    close();
  };

  return (
    <Drawer open={!!itemIds} onOpenChange={(open) => !open && close()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("knowledgeBase.batch.tag.title")}</Drawer.Title>
          <Drawer.Description>
            {t("knowledgeBase.batch.tag.description", {
              count: itemIds?.length ?? 0,
            })}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Text size="small" weight="plus">
              {t("knowledge_item.addTag")}
            </Text>
            <KnowledgeItemEditTag
              defaultValues={tags}
              knowledgeBaseId={knowledgeBaseId}
              onAdd={(tag) => setTags((prev) => [...prev, tag])}
            />
            <Text size="small" className="text-ui-fg-subtle">
              {t("knowledgeBase.batch.tag.hint")}
            </Text>
          </div>
          {tags.length > 0 && (
            <ChipGroup
              onRemove={(index) =>
                setTags((prev) => prev.filter((_, i) => i !== index))
              }
              onClearAll={() => setTags([])}
            >
              {tags.map((tag, index) => (
                <ChipGroup.Chip key={tag} index={index}>
                  {tag}
                </ChipGroup.Chip>
              ))}
            </ChipGroup>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">{t("actions.cancel")}</Button>
          </Drawer.Close>
          <Button
            onClick={handleSave}
            isLoading={batchTag.isPending}
            disabled={tags.length === 0}
          >
            {t("actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
