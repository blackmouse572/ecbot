import { workspaceActivityListQueryOptions } from "@/hooks/api/workspace-activities";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import type { LoaderFunctionArgs } from "react-router-dom";

export const activityLoader = async ({ params }: LoaderFunctionArgs) => {
  const { workspaceSlug } = getWorkspaceParams(params);
  const query = workspaceActivityListQueryOptions({
    workspaceId: workspaceSlug,
    page: 1,
    perPage: 20,
  });
  const data = queryClient.getQueryData(query.queryKey);

  return data ?? queryClient.fetchInfiniteQuery(query);
};
