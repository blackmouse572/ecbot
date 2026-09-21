import {
  followupQueryKeys,
  type FollowupListQuery,
} from "@/hooks/api/followups";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import { followupWorkspaceControllerListV1 } from "@repo/client";
import type { LoaderFunctionArgs } from "react-router-dom";
import { FOLLOWUP_CONSTANTS } from "../constants";

const defaultQuery: FollowupListQuery = {
  page: 1,
  perPage: FOLLOWUP_CONSTANTS.PAGE_SIZE,
};

export const followupsLoader = async ({ params }: LoaderFunctionArgs) => {
  const workspace = getWorkspaceParams(params);
  const queryKey = followupQueryKeys.list(defaultQuery);
  const data = queryClient.getQueryData(queryKey);
  return (
    data ??
    queryClient.fetchQuery({
      queryKey,
      queryFn: () =>
        followupWorkspaceControllerListV1({
          query: defaultQuery,
          path: { workspace: workspace.workspaceSlug },
        } as A).then((r) => r.data),
    })
  );
};
