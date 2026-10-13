import { useResolvedWorkspaceSlug } from "@/hooks/api/workspace";
import { ROUTES } from "@/routes/constants";
import { LogoBoxSpinner } from "@repo/ui/common-components";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { OnboardLayout, OnboardWelcomeForm } from "./components";

export const Onboard = () => {
  const { slug, isLoading } = useResolvedWorkspaceSlug();
  // Once the owner submits, the form navigates into the new workspace
  // itself; the redirect below would otherwise race it to the dashboard.
  const [started, setStarted] = useState(false);

  if (isLoading && !started) {
    return (
      <OnboardLayout>
        <LogoBoxSpinner />
      </OnboardLayout>
    );
  }

  // Already a member of a workspace: go straight to it instead of asking again.
  if (slug && !started) {
    return <Navigate to={`/${slug}/${ROUTES.Dashboard}`} replace />;
  }

  return (
    <OnboardLayout>
      <OnboardWelcomeForm onStart={() => setStarted(true)} />
    </OnboardLayout>
  );
};
