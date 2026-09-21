# Table List Rules

Reference implementation: `@apps/app/src/routes/chatbot/chatbot-list/components/chatbot-list-table/`

## Directory Structure

Each table list feature must follow this structure:

```
[feature]-list-table/
├── index.ts                            # Re-exports
├── [feature]-list-table.tsx            # Main table component
├── [feature]-actions.tsx               # Row action menu
├── [feature]-[...]-cell.tsx             # Cell components (one file per custom cell)
├── hooks/
│   ├── index.ts                        # Re-exports hooks
│   ├── use-[feature]-table-columns.tsx # Column definitions
│   ├── use-[feature]-table-filters.tsx # Filter definitions
│   └── use-[feature]-table-query.ts    # URL search params → query object
└── utils/                              # (optional) helper utilities
```

## Main Table Component (`[feature]-list-table.tsx`)

- Uses `useLoaderData` for `initialData`
- Calls the table query hook, filters hook, and columns hook
- Builds `useDataTable` and renders `_DataTable`
- Renders `<Outlet />` for child routes (create modal)
- Composes action column with `columnHelper.display`

```typescript
import { _DataTable } from "@/components/table/data-table";
import { useChatbots } from "@/hooks/api";
import { useDataTable } from "@/hooks/use-data-table";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLoaderData, useLocation } from "react-router-dom";
import { CHATBOT_CONSTANTS } from "../../../constants";
import { chatbotLoader } from "../../loader";
import { ChatbotActions } from "./chatbot-actions";
import { useChatbotTableColumns, useChatbotTableFilters } from "./hooks";
import { useChatbotTableQuery } from "./hooks/use-chatbot-table-query";

export const ChatbotListTable = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const initialData = useLoaderData() as Awaited<ReturnType<typeof chatbotLoader>>;

  const { searchParams, raw } = useChatbotTableQuery({ pageSize: CHATBOT_CONSTANTS.PAGE_SIZE });
  const filters = useChatbotTableFilters();
  const { chatbots, count, isLoading, isError, error } = useChatbots(
    { ...searchParams },
    { initialData }
  );
  const columns = useColumns();

  const { table } = useDataTable({
    data: chatbots ?? [],
    columns,
    count,
    enablePagination: true,
    pageSize: CHATBOT_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id as string,
  });

  if (isError) throw error;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("chatbot.title")}</Heading>
        <Button size="small" variant="secondary" asChild>
          <Link to="create">
            <PlusMini />
            {t("actions.create")}
          </Link>
        </Button>
      </div>
      <_DataTable
        table={table}
        filters={filters}
        columns={columns}
        count={count}
        pageSize={CHATBOT_CONSTANTS.PAGE_SIZE}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        navigateTo={(row) => `${row.original.id}`}
        orderBy={[
          { key: "name", label: t("fields.name") },
          { key: "updatedAt", label: t("fields.updatedAt") },
        ]}
        noRecords={{ message: t("chatbot.list.noRecordsMessage") }}
      />
      <Outlet />
    </Container>
  );
};

// Actions column is appended here, keeping it out of the base columns hook
const columnHelper = createColumnHelper<ChatbotListResponseDto>();
const useColumns = () => {
  const base = useChatbotTableColumns();
  return useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <ChatbotActions item={row.original} />,
      }),
    ],
    [base]
  );
};
```

## Cell Components

Extract non-trivial cell renderers into separate files. Each cell file exports a single component.

```typescript
// chatbot-name-cell.tsx
interface ChatbotNameCellProps {
  name?: string;
  avatar?: string;
  size?: "small" | "base";
}

export const ChatbotNameCell = ({
  name,
  avatar,
  size = "base",
}: ChatbotNameCellProps) => {
  // ...
};
```

Simple cells (e.g., a `StatusBadge`) that are only one or two lines can live inline in the column definition instead of a separate file.

## Hooks

### `use-[feature]-table-columns.tsx`

- Uses `createColumnHelper` typed to the list DTO
- Returns `useMemo`-wrapped column array
- Uses `columnHelper.display` (not `accessor`) for full cell control
- Imports cell components from sibling files

```typescript
const columnHelper = createColumnHelper<ChatbotListResponseDto>();

export const useChatbotTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => t("fields.name"),
        cell: ({ row }) => <ChatbotNameCell name={row.original.name} avatar={row.original.avatar} />,
      }),
      columnHelper.display({
        id: "status",
        header: () => t("fields.status"),
        cell: ({ row }) => <ChatbotStatusCell status={row.original.status} />,
      }),
      // ... more columns
    ],
    [t]
  );
};
```

### `use-[feature]-table-filters.tsx`

- Returns `Filter[]` array wrapped in `useMemo`
- Fetches any relational data needed for filter options (e.g., accounts list)
- Each filter entry has: `key`, `label`, `type`, `options`, `multiple`, `searchable`

```typescript
export function useChatbotTableFilters(): Filter[] {
  const { t } = useTranslation();
  const { accounts } = useAccounts({ perPage: 50, page: 1 });

  return useMemo<Filter[]>(
    () => [
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        options: [
          { label: t("chatbot.status.active"), value: "active" },
          { label: t("chatbot.status.inactive"), value: "inactive" },
        ],
        multiple: false,
        searchable: true,
      },
      // ...
    ],
    [accounts, t],
  );
}
```

### `use-[feature]-table-query.ts`

- Reads URL search params via `useQueryParams`
- Maps raw string params into typed `searchParams` for the API call
- Returns `{ searchParams, raw }`

```typescript
type UseFeatureTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useChatbotTableQuery = ({
  prefix,
  pageSize = 20,
}: UseFeatureTableQueryProps) => {
  const queryObject = useQueryParams(CHATBOT_QUERY_PARAMS, prefix);
  const { status, type, search, page, account } = queryObject;

  const searchParams = {
    perPage: pageSize,
    page: page ? Number(page) : 1,
    status: status?.split(","),
    type: type?.split(","),
    account: account || undefined,
    search: search || undefined,
  };

  return { searchParams, raw: queryObject };
};
```

## Actions Component (`[feature]-actions.tsx`)

- Accepts a `Pick<FeatureDetailDto, "id" | "name">` prop to keep it lightweight
- Uses `ActionMenu` from `@repo/ui/common-components`
- Handles delete with `usePrompt` confirmation
- Navigates to edit route on edit action

```typescript
export const ChatbotActions = ({
  item,
}: {
  item: Pick<ChatbotGetDetailResponseDto, "id" | "name">;
}) => {
  const { t } = useTranslation();
  const deleteChatbot = useDeleteChatbot();
  const prompt = usePrompt();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("chatbot.list.delete.confirm.title"),
      description: t("chatbot.list.delete.confirm.description", { name: item.name }),
      variant: "danger",
      confirmText: t("chatbot.list.delete.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await deleteChatbot.mutateAsync({ id: item.id as string });
      toast.success(t("chatbot.list.delete.success"));
      navigate(`/${workspaceSlug}/${ROUTES.Chatbot}`);
    } catch {
      toast.error(t("chatbot.list.delete.error"));
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () => navigate(`/${workspaceSlug}/${ROUTES.Chatbot}/${item.id}/edit`),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  );
};
```
