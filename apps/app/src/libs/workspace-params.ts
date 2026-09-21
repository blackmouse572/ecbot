import type { LoaderFunctionArgs } from "react-router-dom";

export const getWorkspaceParams = (params: LoaderFunctionArgs["params"]) => {
  const { workspaceSlug, ...rest } = params;
  if (!workspaceSlug) {
    throw new Error("Workspace slug is required");
  }

  return {
    workspaceSlug,
    ...rest,
  };
};
