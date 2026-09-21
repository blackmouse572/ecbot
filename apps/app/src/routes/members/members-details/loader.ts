import { workspaceMemberQueryOptions } from "@/hooks/api";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";

export const memberDetailsLoader = async ({ params }: Record<string, A>) => {
  // get the workspace from the atom
  const { workspaceSlug } = getWorkspaceParams(params);
  const data = queryClient.ensureQueryData(
    workspaceMemberQueryOptions(params.id, workspaceSlug),
  );
  return data;
};
