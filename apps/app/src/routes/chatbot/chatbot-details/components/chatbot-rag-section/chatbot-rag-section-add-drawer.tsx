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
  useKnowledgeBases,
  useKnowledgeItems,
} from "@/hooks/api/knowledge-base";
import { useKnowledgeTags } from "@/hooks/api/knowledge-tag";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import type {
  KnowledgeItemFilterRequestDto,
  KnowledgeItemResponseDto,
} from "@repo/client";
import {
  KB_BATCH_FILTER_MAX,
  KB_STATUS_CONFIG,
  KB_TYPE_CONFIG,
} from "../../../../knowledge-base/constants";
import { KnowledgeItemStatusCell } from "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-status-cell";
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
// The app's toasts sit top-right, over this drawer's search box.
const DRAWER_TOAST = { position: "bottom-left" } as const;

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
  // Set by "Select all matching": the filters to link, whatever the page.
  const [allMatching, setAllMatching] = useState<{
    filter: KnowledgeItemFilterRequestDto;
    count: number;
  } | null>(null);

  const { knowledgeBases } = useKnowledgeBases();
  const knowledgeBaseId = knowledgeBases?.[0]?.id;
  const { tags } = useKnowledgeTags(knowledgeBaseId || "", {
    enabled: !!knowledgeBaseId,
  });

  // Filter values as comma lists: the API's format, and stable memo keys.
  const asList = (value: unknown) =>
    Array.isArray(value) && value.length ? value.join(",") : undefined;
  const tagsParam = asList(filtering.tags);
  const typeParam = asList(filtering.type);
  const statusParam = asList(filtering.status);
  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: statusParam,
      tags: tagsParam,
      type: typeParam,
    }),
    [search, statusParam, tagsParam, typeParam],
  );

  // The same filters as a request body, for "select all matching".
  const filterBody = useMemo(
    (): KnowledgeItemFilterRequestDto => ({
      search: search || undefined,
      type: filtering.type as KnowledgeItemFilterRequestDto["type"],
      status: filtering.status as KnowledgeItemFilterRequestDto["status"],
      tags: filtering.tags as string[] | undefined,
    }),
    [search, filtering],
  );

  const { items, count, isLoading } = useKnowledgeItems(
    knowledgeBaseId || "",
    { ...filters, perPage: PAGE_SIZE, page: pagination.pageIndex + 1 },
    { enabled: !!knowledgeBaseId },
  );
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
            mime={row.original.attachment?.mime}
          />
        ),
      }),
      columnHelper.accessor("status", {
        header: t("knowledgeBase.list.columns.status"),
        cell: ({ row }) => (
          <KnowledgeItemStatusCell
            status={row.original.status}
            errorMessage={row.original.errorMessage}
            processedAt={row.original.processedAt}
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
      filterHelper.accessor("type", {
        label: t("fields.type"),
        type: "multiselect",
        options: Object.entries(KB_TYPE_CONFIG).map(([value, { label }]) => ({
          label,
          value,
        })),
      }),
      filterHelper.accessor("status", {
        label: t("fields.status"),
        type: "multiselect",
        options: Object.entries(KB_STATUS_CONFIG).map(([value, { label }]) => ({
          label,
          value,
        })),
      }),
      filterHelper.accessor("tags", {
        label: t("knowledgeBase.list.columns.tags"),
        type: "multiselect",
        options: (tags || []).map((name) => ({ label: name, value: name })),
      }),
    ],
    [t, tags],
  );

  const pickedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedCount = allMatching
    ? Math.min(allMatching.count, KB_BATCH_FILTER_MAX)
    : pickedIds.length;
  // With everything selected, every row shows as checked on every page.
  const shownSelection = useMemo(
    () =>
      allMatching
        ? Object.fromEntries(visibleItems.map((item) => [item.id, true]))
        : rowSelection,
    [allMatching, visibleItems, rowSelection],
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
        setAllMatching(null);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      },
    },
    search: {
      state: search,
      onSearchChange: (value) => {
        setSearch(value);
        setAllMatching(null);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      },
    },
    pagination: { state: pagination, onPaginationChange: setPagination },
    rowSelection: {
      state: shownSelection,
      onRowSelectionChange: (state) => {
        setAllMatching(null);
        setRowSelection(state);
      },
    },
  });

  const handleSelectAllMatching = () => {
    if (count > KB_BATCH_FILTER_MAX) {
      toast.warning(
        t("knowledgeBase.link.selectionTruncated", {
          count: KB_BATCH_FILTER_MAX,
        }),
        DRAWER_TOAST,
      );
    }
    setAllMatching({ filter: filterBody, count });
  };

  const handleClose = () => {
    setRowSelection({});
    setAllMatching(null);
    setSearch("");
    setFiltering({});
    setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
    onClose();
  };

  const handleAdd = async () => {
    if (selectedCount === 0) {
      toast.error(
        t("knowledgeBase.error.selectItem", "Please select an item"),
        DRAWER_TOAST,
      );
      return;
    }

    try {
      const result = await linkMutation.mutateAsync(
        allMatching && knowledgeBaseId
          ? { knowledgeBaseId, filter: allMatching.filter }
          : pickedIds,
      );
      notifyBatchResult(result);
      handleClose();
    } catch {
      toast.error(
        t("knowledgeBase.error.linkFailed", "Failed to link knowledge item"),
        DRAWER_TOAST,
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
                    count: selectedCount,
                  })}
                </Text>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={handleSelectAllMatching}
                  disabled={count === 0 || !!allMatching}
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
              disabled={selectedCount === 0}
            >
              {selectedCount > 0
                ? t("knowledgeBase.link.addCount", {
                    count: selectedCount,
                  })
                : t("actions.add")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
