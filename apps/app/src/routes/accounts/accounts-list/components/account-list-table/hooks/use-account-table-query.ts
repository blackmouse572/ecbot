import type { AccountGetDetailResponseDto } from "@repo/client";
import { useQueryParams, type QueryParams } from "@repo/ui/hooks";

/** Rows per page, shared by the route loader and the accounts table. */
export const ACCOUNTS_PAGE_SIZE = 20;

/** Facet params the accounts table drives from its filter chips. */
const FACETS = ["status", "chatbot", "type"];

/** Every URL search param the accounts list table reads. */
export const ACCOUNT_TABLE_PARAMS = ["page", "perPage", "search", ...FACETS];

type AccountStatus = AccountGetDetailResponseDto["status"];

/** Shapes raw URL params into the accounts list endpoint query. */
export const toAccountListQuery = (
  urlParams: QueryParams<string>,
  perPage: number,
) => ({
  raw: urlParams,
  searchParams: {
    perPage,
    page: urlParams.page ? Number(urlParams.page) : 1,
    status: urlParams.status?.split(",") as AccountStatus[],
    search: urlParams.search || undefined,
    chatbot: urlParams.chatbot || undefined,
    type: urlParams.type || undefined,
  },
});

type UseAccountTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useAccountTableQuery = ({
  prefix,
  pageSize = ACCOUNTS_PAGE_SIZE,
}: UseAccountTableQueryProps) =>
  toAccountListQuery(useQueryParams(ACCOUNT_TABLE_PARAMS, prefix), pageSize);
