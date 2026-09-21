import { useParams } from "react-router-dom";

type WorkspaceParams = {
  workspaceSlug: string;
  [key: string]: string | undefined;
};
export function useWorkspaceParams() {
  const { workspaceSlug, ...rest } = useParams<WorkspaceParams>();

  if (!workspaceSlug) {
    throw new Error(`Error: workspaceSlug is required in the URL parameters.
        How to fix:
        1. Ensure the URL includes a workspace slug, e.g., /workspace/my-workspace.
        2. If you are using a dynamic route, make sure the route is defined correctly in your routing configuration.
        `);
  }

  return {
    workspaceSlug,
    ...rest,
  };
}
