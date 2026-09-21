import { useQueryParams, type QueryParams } from "@repo/ui/hooks";

type UseRoleTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const ROLE_ALLOW_QUERY_PARAMS = ["page", "perPage", "search"];

export function bakeRoleTableQueryParams(
  queryObject: QueryParams<string>,
  pageSize: number,
) {
  const { search, page } = queryObject;

  const searchParams = {
    perPage: pageSize,
    page: page ? Number(page) : 1,
    search: search || undefined,
  };

  return {
    searchParams,
    raw: queryObject,
  };
}

export const useRoleTableQuery = ({
  prefix,
  pageSize = 20,
}: UseRoleTableQueryProps) => {
  const queryObject = useQueryParams(ROLE_ALLOW_QUERY_PARAMS, prefix);

  return bakeRoleTableQueryParams(queryObject, pageSize);
};
