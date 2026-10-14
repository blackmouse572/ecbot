import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Button, Checkbox, Drawer, Input, Text, toast } from "@medusajs/ui";
import { Combobox } from "@repo/ui/common-components";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDebounceValue } from "usehooks-ts";
import { withOriginAgent } from "@/utils/origin-agent";
import {
  useBatchLinkKnowledgeItemsToChatbot,
  useFetchAllKnowledgeItemIds,
  useKnowledgeBases,
  useKnowledgeItems,
} from "@/hooks/api/knowledge-base";
import { useKnowledgeTags } from "@/hooks/api/knowledge-tag";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { KnowledgeItemTagListCell } from "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-tag-list-cell";
import { KnowledgeItemTitleCell } from "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-title-cell";
import { PlusMini } from "@medusajs/icons";

type ChatbotRAGSectionAddDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  linkedItemIds?: string[];
};

// Rows shown at once; "Select all matching" reaches past them.
const PAGE_SIZE = 100;

export function ChatbotRAGSectionAddDrawer({
  isOpen,
  onClose,
  chatbotId,
  linkedItemIds = [],
}: ChatbotRAGSectionAddDrawerProps) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const notifyBatchResult = useBatchResultToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [tag, setTag] = useState("");
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const { knowledgeBases } = useKnowledgeBases();
  const knowledgeBaseId = knowledgeBases?.[0]?.id;
  const { tags } = useKnowledgeTags(knowledgeBaseId || "", {
    enabled: !!knowledgeBaseId,
  });

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      tags: tag || undefined,
    }),
    [debouncedSearch, tag],
  );

  const { items, count, isLoading } = useKnowledgeItems(
    knowledgeBaseId || "",
    { ...filters, perPage: PAGE_SIZE },
    { enabled: !!knowledgeBaseId },
  );
  const fetchAllIds = useFetchAllKnowledgeItemIds(knowledgeBaseId || "");
  const linkMutation = useBatchLinkKnowledgeItemsToChatbot(chatbotId);

  const linked = useMemo(() => new Set(linkedItemIds), [linkedItemIds]);
  const visibleItems = useMemo(
    () => (items || []).filter((item) => !linked.has(item.id)),
    [items, linked],
  );

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAllMatching = async () => {
    setIsSelectingAll(true);
    try {
      const ids = await fetchAllIds(filters);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.filter((id) => !linked.has(id)).forEach((id) => next.add(id));
        return next;
      });
    } catch {
      toast.error(t("general.loadFailed"));
    } finally {
      setIsSelectingAll(false);
    }
  };

  const reset = () => {
    setSelectedIds(new Set());
    setSearch("");
    setTag("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) {
      toast.error(t("knowledgeBase.error.selectItem", "Please select an item"));
      return;
    }

    try {
      const result = await linkMutation.mutateAsync([...selectedIds]);
      notifyBatchResult(result);
      handleClose();
    } catch {
      toast.error(
        t("knowledgeBase.error.linkFailed", "Failed to link knowledge item"),
      );
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {t("knowledgeBase.link.title", "Add Knowledge Item")}
          </Drawer.Title>
          <Drawer.Description className="sr-only">
            {t("knowledgeBase.link.description")}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-hidden">
          <div className="flex flex-col gap-2">
            <Input
              type="search"
              size="small"
              value={search}
              placeholder={t("knowledgeBase.link.searchPlaceholder")}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Combobox
              value={tag}
              allowClear
              placeholder={t("knowledgeBase.link.tagFilter")}
              options={(tags || []).map((name) => ({
                label: name,
                value: name,
              }))}
              onChange={(v) => setTag(v ?? "")}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Text size="small" className="text-ui-fg-subtle">
              {t("knowledgeBase.link.selected", { count: selectedIds.size })}
            </Text>
            <div className="flex items-center gap-1">
              {selectedIds.size > 0 && (
                <Button
                  size="small"
                  variant="transparent"
                  onClick={() => setSelectedIds(new Set())}
                >
                  {t("knowledgeBase.link.clear")}
                </Button>
              )}
              <Button
                size="small"
                variant="secondary"
                onClick={handleSelectAllMatching}
                isLoading={isSelectingAll}
                disabled={count === 0}
              >
                {t("knowledgeBase.link.selectAllMatching", { count })}
              </Button>
            </div>
          </div>

          <ul
            className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto rounded-lg border bg-ui-bg-component"
            aria-label={t("knowledgeBase.selectItem", "Select Item")}
          >
            {isLoading && (
              <li className="px-3 py-4 text-ui-fg-subtle">
                <Text size="small">{t("general.loading")}</Text>
              </li>
            )}
            {!isLoading && visibleItems.length === 0 && (
              <li className="px-3 py-4 text-ui-fg-subtle">
                <Text size="small">{t("knowledgeBase.link.noItems")}</Text>
              </li>
            )}
            {visibleItems.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ui-bg-component-hover">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) =>
                      toggle(item.id, checked === true)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <KnowledgeItemTitleCell
                      title={item.title}
                      type={item.type}
                    />
                  </div>
                  <KnowledgeItemTagListCell tags={item.tags} />
                </label>
              </li>
            ))}
          </ul>
        </Drawer.Body>
        <Drawer.Footer>
          {knowledgeBaseId && (
            <Button variant="transparent" asChild>
              <Link
                to={withOriginAgent(
                  `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/create`,
                  chatbotId,
                )}
              >
                <PlusMini />
                {t("actions.createNew")}
              </Link>
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Drawer.Close asChild>
              <Button variant="secondary">{t("actions.cancel")}</Button>
            </Drawer.Close>
            <Button
              onClick={handleAdd}
              isLoading={linkMutation.isPending}
              disabled={selectedIds.size === 0}
            >
              {selectedIds.size > 0
                ? t("knowledgeBase.link.addCount", { count: selectedIds.size })
                : t("actions.add")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
