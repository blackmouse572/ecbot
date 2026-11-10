import { trackedLinkDetailQueryOptions } from "@/hooks/api/tracked-links";
import queryClient from "@/libs/query-client";
import type { LoaderFunctionArgs } from "react-router-dom";

export async function sourceDetailLoader({ params }: LoaderFunctionArgs) {
  const { workspaceSlug, sourceId } = params;

  if (!workspaceSlug || !sourceId) {
    throw new Error("workspaceSlug and sourceId are required");
  }

  return queryClient.ensureQueryData(
    trackedLinkDetailQueryOptions(workspaceSlug, sourceId),
  );
}
