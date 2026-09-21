import { useQueryParamsWithSort } from "@repo/ui/hooks";
import { KB_QUERY_PARAMS } from "../../../../constants";

type UseKnowledgeBaseTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useKnowledgeBaseTableQuery = (
  props?: UseKnowledgeBaseTableQueryProps,
) => {
  const { prefix, pageSize } = props || {};
  const queryObject = useQueryParamsWithSort(KB_QUERY_PARAMS, prefix);

  const { type, status, tags, search, page, orderBy, orderDirection } =
    queryObject;

  const searchParams = {
    perPage: pageSize,
    page: page ? Number.parseInt(page) : undefined,
    type: type,
    status: status,
    tags: tags,
    search: search,
    orderBy: orderBy,
    orderDirection: orderDirection,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
