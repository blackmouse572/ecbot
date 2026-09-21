import { useQueryParams } from "@repo/ui/hooks";
import type { ToolListParams } from "@/hooks/api/tools";
import { TOOL_QUERY_PARAMS } from "../../../../constants";

type UseToolTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useToolTableQuery = ({
  prefix,
  pageSize = 20,
}: UseToolTableQueryProps) => {
  const queryObject = useQueryParams([...TOOL_QUERY_PARAMS], prefix);
  const { search, page, kind, status, mcpProvider } = queryObject;

  const searchParams: ToolListParams = {
    perPage: pageSize,
    page: page ? Number(page) : 1,
    search: search || undefined,
    kind: (kind || undefined) as ToolListParams["kind"],
    status: (status || undefined) as ToolListParams["status"],
    mcpProvider: (mcpProvider || undefined) as ToolListParams["mcpProvider"],
  };

  return { searchParams, raw: queryObject };
};
