import { useResolvedWorkspaceSlug } from "@/hooks/api/workspace";
import { ROUTES } from "@/routes/constants";
import { LogoBoxSpinner } from "@repo/ui/common-components";
import { Navigate, useNavigate } from "react-router-dom";
import { OnboardLayout } from "./components";
import { OnboardSelectWorkspaceForm } from "./components/onboard-select-form/onboard-select-form";

export const Onboard = () => {
  const navigate = useNavigate();
  const { slug, isLoading } = useResolvedWorkspaceSlug();

  if (isLoading) {
    return (
      <OnboardLayout>
        <LogoBoxSpinner />
      </OnboardLayout>
    );
  }

  // Already a member of a workspace — go straight to it instead of asking again.
  if (slug) {
    return <Navigate to={`/${slug}/${ROUTES.Dashboard}`} replace />;
  }

  const handleWorkspaceSubmit = (data: { workspace: string }) => {
    if (data.workspace === "new") {
      navigate("/onboard/create");
    } else {
      navigate("/onboard/join");
    }
  };

  return (
    <OnboardLayout>
      <OnboardSelectWorkspaceForm onSubmit={handleWorkspaceSubmit} />
    </OnboardLayout>
  );
};
