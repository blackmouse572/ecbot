import { useResolvedWorkspaceSlug } from "@/hooks/api/workspace";
import { ROUTES } from "@/routes/constants";
import { LogoBoxSpinner } from "@repo/ui/common-components";
import { Navigate } from "react-router-dom";

export function RootRedirect() {
  const { slug, isLoading } = useResolvedWorkspaceSlug();

  if (isLoading) {
    return <LogoBoxSpinner />;
  }

  if (!slug) {
    return <Navigate to={`/${ROUTES.Onboard}`} replace />;
  }

  return <Navigate to={`/${slug}/${ROUTES.Dashboard}`} replace />;
}
