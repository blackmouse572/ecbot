import type { AccountGetDetailResponseDto } from "@repo/client";
import { useQueryParams, type QueryParams } from "@repo/ui/hooks";

/** Rows per page, shared by the route loader and the table. */
export const MEMBERS_PAGE_SIZE = 20;

/** URL search params the members table understands. */
export const MEMBER_TABLE_PARAMS = ["page", "perPage", "status", "search"];

type MemberStatus = AccountGetDetailResponseDto["status"];

/** Shapes raw URL params into the members list endpoint query. */
export const toMemberListQuery = (
  urlParams: QueryParams<string>,
  perPage: number,
) => ({
  raw: urlParams,
  searchParams: {
    perPage,
    page: urlParams.page ? Number(urlParams.page) : 1,
    status: urlParams.status?.split(",") as MemberStatus[],
    search: urlParams.search || undefined,
  },
});

export const useMemberTableQuery = (
  perPage = MEMBERS_PAGE_SIZE,
  prefix?: string,
) => toMemberListQuery(useQueryParams(MEMBER_TABLE_PARAMS, prefix), perPage);
