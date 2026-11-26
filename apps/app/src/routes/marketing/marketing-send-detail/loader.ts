import { loadFeatureFlags } from "@/hooks/api/feature-flags";
import { marketingSendQueryOptions } from "@/hooks/api/marketing-sends";
import queryClient from "@/libs/query-client";
import type { LoaderFunctionArgs } from "react-router-dom";

export async function marketingSendDetailLoader({
  params,
}: LoaderFunctionArgs) {
  const { workspaceSlug, sendId } = params;

  if (!workspaceSlug || !sendId) {
    throw new Error("workspaceSlug and sendId are required");
  }

  // Loaders run before the section's FeatureRoute renders its not-found page,
  // so skip the request the API would 404 while marketing is off.
  const flags = await loadFeatureFlags(workspaceSlug);
  if (!flags.marketing) return null;

  return queryClient.ensureQueryData(
    marketingSendQueryOptions(workspaceSlug, sendId),
  );
}
