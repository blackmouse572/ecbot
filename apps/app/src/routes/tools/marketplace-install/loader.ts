import type { LoaderFunctionArgs } from "react-router-dom";
import { toolkitDetailQueryOptions } from "@/hooks/api/tools";
import queryClient from "@/libs/query-client";

export async function marketplaceInstallLoader({ params }: LoaderFunctionArgs) {
  const { workspaceSlug, slug } = params;
  if (!workspaceSlug || !slug) return null;
  const query = toolkitDetailQueryOptions(workspaceSlug, slug);
  return queryClient.ensureQueryData(query).catch(() => null);
}
