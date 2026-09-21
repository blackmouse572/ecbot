import { workspaceRoleDetailQueryOptions } from "@/hooks/api/workspace-roles";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import type { LoaderFunctionArgs } from "react-router-dom";

export const roleDetailLoader = ({ params }: LoaderFunctionArgs) => {
  const { workspaceSlug } = getWorkspaceParams(params);
  const roleId = params.id;

  return queryClient.ensureQueryData(
    workspaceRoleDetailQueryOptions(workspaceSlug, roleId!),
  );
};
