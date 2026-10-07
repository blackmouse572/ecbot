import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { useWorkspaceList } from "@/hooks/api/workspace";
import {
  loginRedirectPath,
  useAuthToken,
  useRefreshTokenEffect,
  useUserAbility,
} from "@/modules/auth";
import { ROUTES } from "@/routes";
import { AbilityProvider } from "@repo/auth";
import {
  NavAccessProvider,
  SidebarProvider,
  type NavAbility,
} from "@repo/ui/layout";
import { useCallback } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
// import { SearchProvider } from "../../../providers/search-provider";
const ignorePaths = [ROUTES.Onboard, ROUTES.OnboardJoin] as string[];
export const ProtectedRoute = () => {
  const token = useAuthToken();
  const { workspaces, isLoading } = useWorkspaceList();
  const location = useLocation();
  const ability = useUserAbility();
  const can = useCallback(
    ({ action, subject }: NavAbility) => ability.can(action, subject),
    [ability],
  );

  useRefreshTokenEffect();

  if (!token) {
    return <Navigate to={loginRedirectPath(location)} replace />;
  }

  if (isLoading) {
    return null;
  }

  // if (
  //   workspaces.length > 0 &&
  //   location.pathname.startsWith(`/${ROUTES.Onboard}`)
  // ) {
  //   return (
  //     <Navigate
  //       to={["/", workspaces[0].slug, "/", ROUTES.Dashboard].join("")}
  //       replace
  //     />
  //   );
  // }

  // If dont have workspace and do not start with ignore path, redirect to onboard
  if (
    workspaces.length === 0 &&
    !ignorePaths.some((path) => location.pathname.startsWith(`/${path}`))
  ) {
    return <Navigate to={"/" + ROUTES.Onboard} replace />;
  }

  return (
    <SidebarProvider>
      <AbilityProvider ability={ability}>
        <NavAccessProvider can={can}>
          {/* <SearchProvider> */}
          <Outlet />
          {/* </SearchProvider> */}
          {/* Mounted here, not in a layout, so it also covers /onboard/* and
              /join, which render outside MainLayout. */}
          <ImpersonationBanner />
        </NavAccessProvider>
      </AbilityProvider>
    </SidebarProvider>
  );
};
