import { workspaceDetailsQueryOptions } from "@/hooks/api/workspace";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import type { LoaderFunctionArgs } from "react-router-dom";

export const workspaceDetailsLoader = async ({
  params,
}: LoaderFunctionArgs) => {
  const { workspaceSlug } = getWorkspaceParams(params);

  const query = workspaceDetailsQueryOptions(workspaceSlug);
  const data = await queryClient.ensureQueryData(query);

  return data;
};
