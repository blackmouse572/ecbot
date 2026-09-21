import { workspaceRoleListQueryOptions } from "@/hooks/api/workspace-roles";
import { getQueryParams } from "@repo/ui/hooks";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import type { LoaderFunctionArgs } from "react-router-dom";
import {
  ROLE_ALLOW_QUERY_PARAMS,
  bakeRoleTableQueryParams,
} from "./components/role-list-table";

export const roleListLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  // get the workspace from the atom
  const workspace = getWorkspaceParams(params);
  const _searchParams = new URL(request.url).searchParams;

  const queryObject = getQueryParams(_searchParams, ROLE_ALLOW_QUERY_PARAMS);
  const { searchParams } = bakeRoleTableQueryParams(queryObject, 20);

  const query = workspaceRoleListQueryOptions(
    workspace.workspaceSlug,
    searchParams,
  );

  const data = queryClient.ensureQueryData(query);
  return data;
};
