import { accountQueryOptions } from "@/hooks/api";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";

export const accountDetailsLoader = async ({ params }: Record<string, A>) => {
  // get the workspace from the atom
  const { workspaceSlug } = getWorkspaceParams(params);
  const data = queryClient.ensureQueryData(
    accountQueryOptions(params.id, workspaceSlug),
  );
  return data;
};
