import type { LoaderFunctionArgs } from "react-router-dom";
import { toolDetailQueryOptions } from "@/hooks/api/tools";
import queryClient from "@/libs/query-client";

export async function toolDetailLoader({ params }: LoaderFunctionArgs) {
  const { workspaceSlug, toolId } = params;
  if (!workspaceSlug || !toolId) {
    throw new Error("workspaceSlug and toolId are required");
  }
  const query = toolDetailQueryOptions(workspaceSlug, toolId);
  return queryClient.ensureQueryData(query);
}
