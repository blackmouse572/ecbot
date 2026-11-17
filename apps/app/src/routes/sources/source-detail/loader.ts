import { loadFeatureFlags } from "@/hooks/api/feature-flags";
import { trackedLinkDetailQueryOptions } from "@/hooks/api/tracked-links";
import queryClient from "@/libs/query-client";
import type { LoaderFunctionArgs } from "react-router-dom";

export async function sourceDetailLoader({ params }: LoaderFunctionArgs) {
  const { workspaceSlug, sourceId } = params;

  if (!workspaceSlug || !sourceId) {
    throw new Error("workspaceSlug and sourceId are required");
  }

  // Loaders run before the section's FeatureRoute renders its not-found page,
  // so skip the request the API would 404 while Nguồn khách is off.
  const flags = await loadFeatureFlags(workspaceSlug);
  if (!flags.customerSources) return null;

  return queryClient.ensureQueryData(
    trackedLinkDetailQueryOptions(workspaceSlug, sourceId),
  );
}
