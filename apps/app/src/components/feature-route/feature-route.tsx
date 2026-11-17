import type { FeatureFlagKey } from "@/hooks/api/feature-flags";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { NotFound } from "@/routes/not-found/not-found";
import { Spinner } from "@medusajs/icons";
import type { FC } from "react";
import { Outlet } from "react-router-dom";

type FeatureRouteProps = { flag: FeatureFlagKey };

/** Renders a flagged section's routes, or the not-found page while its flag is off. */
export const FeatureRoute: FC<FeatureRouteProps> = ({ flag }) => {
  const { flags, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center py-16">
        <Spinner className="text-ui-fg-muted animate-spin" />
      </div>
    );
  }

  return flags[flag] ? <Outlet /> : <NotFound />;
};
