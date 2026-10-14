import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import {
  Button,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  Drawer,
  Text,
  toast,
  useDataTable,
  type DataTableFilteringState,
  type DataTablePaginationState,
  type DataTableRowSelectionState,
} from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { withOriginAgent } from "@/utils/origin-agent";
import {
  useBatchLinkKnowledgeItemsToChatbot,
  useFetchAllKnowledgeItemIds,
  useKnowledgeBases,
  useKnowledgeItems,
} from "@/hooks/api/knowledge-base";
import { useKnowledgeTags } from "@/hooks/api/knowledge-tag";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { KnowledgeItemTagListCell } from "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-tag-list-cell";
import { KnowledgeItemTitleCell } from "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-title-cell";
import { PlusMini } from "@medusajs/icons";

type ChatbotRAGSectionAddDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  linkedItemIds?: string[];
};

const PAGE_SIZE = 10;

const columnHelper = createDataTableColumnHelper<KnowledgeItemResponseDto>();
const filterHelper = createDataTableFilterHelper<KnowledgeItemResponseDto>();

export function ChatbotRAGSectionAddDrawer({
  isOpen,
  onClose,
  chatbotId,
  linkedItemIds = [],
}: ChatbotRAGSectionAddDrawerProps) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const notifyBatchResult = useBatchResultToast();

  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
    {},
  );
  const [search, setSearch] = useState("");
  const [filtering, setFiltering] = useState<DataTableFilteringState>({});
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const { knowledgeBases } = useKnowledgeBases();
  const knowledgeBaseId = knowledgeBases?.[0]?.id;
  const { tags } = useKnowledgeTags(knowledgeBaseId || "", {
    enabled: !!knowledgeBaseId,
  });

  const selectedTags = (filtering.tags as string[] | undefined) ?? [];
  const filters = useMemo(
    () => ({
      search: search || undefined,
      tags: selectedTags.length ? selectedTags.join(",") : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, selectedTags.join(",")],
  );

  const { items, count, isLoading } = useKnowledgeItems(
    knowledgeBaseId || "",
    { ...filters, perPage: PAGE_SIZE, page: pagination.pageIndex + 1 },
    { enabled: !!knowledgeBaseId },
  );
  const fetchAllIds = useFetchAllKnowledgeItemIds(knowledgeBaseId || "");
  const linkMutation = useBatchLinkKnowledgeItemsToChatbot(chatbotId);

  const linked = useMemo(() => new Set(linkedItemIds), [linkedItemIds]);
  const visibleItems = useMemo(
    () => (items || []).filter((item) => !linked.has(item.id)),
    [items, linked],
  );

  const columns = useMemo(
    () => [
      columnHelper.select(),
      columnHelper.accessor("title", {
        header: t("knowledgeBase.list.columns.title"),
        cell: ({ row }) => (
          <KnowledgeItemTitleCell
            title={row.original.title}
            type={row.original.type}
          />
        ),
      }),
      columnHelper.accessor("tags", {
        header: t("knowledgeBase.list.columns.tags"),
        cell: ({ row }) => (
          <KnowledgeItemTagListCell tags={row.original.tags} />
        ),
      }),
    ],
    [t],
  );

  const tableFilters = useMemo(
    () => [
      filterHelper.accessor("tags", {
        label: t("knowledgeBase.list.columns.tags"),
        type: "multiselect",
        options: (tags || []).map((name) => ({ label: name, value: name })),
      }),
    ],
    [t, tags],
  );

  const selectedIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id],
  );

  const table = useDataTable({
    data: visibleItems,
    columns,
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
    filters: tableFilters,
    filtering: {
      state: filtering,
      onFilteringChange: (state) => {
        setFiltering(state);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      },
    },
    search: {
      state: search,
      onSearchChange: (value) => {
        setSearch(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      },
    },
    pagination: { state: pagination, onPaginationChange: setPagination },
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: setRowSelection,
    },
  });

  const handleSelectAllMatching = async () => {
    setIsSelectingAll(true);
    try {
      const { ids, truncated } = await fetchAllIds(filters);
      if (truncated) {
        toast.warning(
          t("knowledgeBase.link.selectionTruncated", { count: ids.length }),
        );
      }
      setRowSelection((prev) => ({
        ...prev,
        ...Object.fromEntries(
          ids.filter((id) => !linked.has(id)).map((id) => [id, true]),
        ),
      }));
    } catch {
      toast.error(t("general.loadFailed"));
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleClose = () => {
    setRowSelection({});
    setSearch("");
    setFiltering({});
    setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
    onClose();
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      toast.error(t("knowledgeBase.error.selectItem", "Please select an item"));
      return;
    }

    try {
      const result = await linkMutation.mutateAsync(selectedIds);
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
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto p-0">
          <DataTable instance={table}>
            <DataTable.Toolbar
              className="flex flex-col gap-2 px-4 pt-4"
              translations={{ clearAll: t("actions.clearAll") }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <DataTable.FilterMenu tooltip={t("filters.addFilter")} />
                <DataTable.Search
                  placeholder={t("knowledgeBase.link.searchPlaceholder")}
                />
              </div>
              <div className="flex w-full items-center justify-between gap-2">
                <Text size="small" className="text-ui-fg-subtle">
                  {t("knowledgeBase.link.selected", {
                    count: selectedIds.length,
                  })}
                </Text>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={handleSelectAllMatching}
                  isLoading={isSelectingAll}
                  disabled={count === 0}
                >
                  {t("knowledgeBase.link.selectAllMatching")}
                </Button>
              </div>
            </DataTable.Toolbar>
            <DataTable.Table />
            <DataTable.Pagination
              translations={{
                of: t("general.of"),
                results: t("general.results"),
                pages: t("general.pages"),
                prev: t("general.prev"),
                next: t("general.next"),
              }}
            />
          </DataTable>
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
              disabled={selectedIds.length === 0}
            >
              {selectedIds.length > 0
                ? t("knowledgeBase.link.addCount", {
                    count: selectedIds.length,
                  })
                : t("actions.add")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
