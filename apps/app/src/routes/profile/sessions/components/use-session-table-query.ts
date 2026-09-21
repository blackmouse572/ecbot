import { useQueryParams, type QueryParams } from "@repo/ui/hooks";
import { isSessionStatus } from "@/modules/sessions";

type UseSessionTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const SESSION_ALLOW_QUERY_PARAMS = ["page", "perPage", "status"];

export function bakeSessionsTableQueryParams(
  queryObject: QueryParams<string>,
  pageSize: number,
) {
  const { page, status } = queryObject;

  const selected = status?.split(",").filter(isSessionStatus) ?? [];

  const searchParams = {
    perPage: pageSize,
    page: page ? Number(page) : 1,
    // Revoked sessions are noise by default; the filter opts into them.
    status: (selected.length ? selected : ["ACTIVE"]).join(","),
    // API defaults to createdAt ASC — newest session first reads better here.
    orderBy: "createdAt",
    orderDirection: "DESC" as const,
  };

  return {
    searchParams,
    raw: queryObject,
  };
}

export const useSessionsTableQuery = ({
  prefix,
  pageSize = 20,
}: UseSessionTableQueryProps) => {
  const queryObject = useQueryParams(SESSION_ALLOW_QUERY_PARAMS, prefix);

  return bakeSessionsTableQueryParams(queryObject, pageSize);
};
