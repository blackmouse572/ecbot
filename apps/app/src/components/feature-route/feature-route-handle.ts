import type { FeatureFlagKey } from "@/hooks/api/feature-flags";
import { isFeatureOn, loadFeatureFlags } from "@/hooks/api/feature-flags";
import type { ReactNode } from "react";
import type { LoaderFunctionArgs, UIMatch } from "react-router-dom";

/**
 * Loads the workspace's flags before a flagged section renders, so its
 * breadcrumb can read them from the cache.
 */
export const featureRouteLoader = async ({ params }: LoaderFunctionArgs) => {
  await loadFeatureFlags(params.workspaceSlug);
  return null;
};

/** A flagged section's breadcrumb: its title while the flag is on, else none. */
export const featureBreadcrumb =
  (flag: FeatureFlagKey, label: () => ReactNode) => (match: UIMatch) =>
    isFeatureOn(match.params.workspaceSlug, flag) ? label() : null;
