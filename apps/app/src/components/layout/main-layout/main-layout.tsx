import {
  CogSixTooth,
  CursorArrowRays,
  House,
  MagnifyingGlass,
  OpenRectArrowOut,
} from "@medusajs/icons";
import { GuideMoments } from "@/components/guide";
import { GettingStartedNav } from "@/routes/dashboard/components/getting-started-nav/getting-started-nav";
import { RecentAgentsSection } from "./recent-agents-section";
import { ScrollEdgeBlur } from "./scroll-edge-blur";
import { Divider, DropdownMenu, Text, clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { LogoBoxSpinner } from "@repo/ui/common-components";
import { Navigate, useLocation } from "react-router-dom";
import { NavHintPopover, NavItem, Shell, type INavItem } from "@repo/ui/layout";
import { UserMenu } from "../user-menu";
import {
  CommandPalette,
  commandPaletteOpenAtom,
  commandPaletteShortcutLabel,
} from "../command-palette";
import { useCoreRoutes } from "./use-core-routes";
import { useSetAtom } from "jotai";
import { NotificationMenu } from "../notification-menu/notification-menu";

import { useAnalyticsGroup } from "@/analytics/use-analytics-group";
import { useLogout } from "@/hooks/api";
import { useEnsureWorkspace, useWorkspaceList } from "@/hooks/api/workspace";
import { useScrollEdges } from "@/hooks/use-scroll-edges";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";
import { WorkspaceNotFound } from "./workspace-not-found";
import { WorkspaceSuspended } from "./workspace-suspended";
import { WorkspaceSwitcher } from "../workspace-switcher";
import type { WorkSpaceGetResponseDto } from "@repo/client";

// The type of the nested nav entries used in the workspace nav group below
// (e.g. the `items` under the agents/chatbot entry) — exported so the
// enterprise overlay (apps/app/src/routes/enterprise.nav.ts) can type its
// contributed items against the exact same shape.
export type WorkspaceNavItem = NonNullable<INavItem["items"]>[number];

export const MainLayout = () => {
  const { t } = useTranslation();
  // Ensure we have a valid workspace
  const { workspace, isLoading, hasWorkspaces, isSuspended, isNotFound } =
    useEnsureWorkspace();
  const { workspaces } = useWorkspaceList();
  const { workspaceSlug } = useWorkspaceParams();
  useAnalyticsGroup(workspace?.id);
  if (isLoading) {
    return <LogoBoxSpinner />;
  }

  if (!hasWorkspaces) {
    return <Navigate to={ROUTES.Onboard} replace />;
  }

  if (isSuspended) {
    return (
      <WorkspaceSuspended workspaces={workspaces} currentSlug={workspaceSlug} />
    );
  }

  // Before the shell, so no page under it runs against a workspace the user
  // cannot open (the dashboard used to crash there).
  if (isNotFound) {
    return <WorkspaceNotFound workspaces={workspaces} />;
  }

  return (
    <>
      <Shell
        mobileNavLabels={{
          title: t("app.nav.accessibility.title"),
          description: t("app.nav.accessibility.description"),
        }}
        topbarActions={<NotificationMenu />}
      >
        {workspace && (
          <MainSidebar workspaces={workspaces} currentWorkspace={workspace} />
        )}
      </Shell>
      {/* Outside the shell, whose children render in both sidebars. */}
      {workspace && <GuideMoments />}
      {workspace && <CommandPalette />}
    </>
  );
};

interface MainSidebarProps {
  workspaces: WorkSpaceGetResponseDto[];
  currentWorkspace: WorkSpaceGetResponseDto;
}

const MainSidebar = ({ workspaces, currentWorkspace }: MainSidebarProps) => {
  const edges = useScrollEdges(currentWorkspace.id);
  return (
    <aside
      ref={edges.ref}
      onScroll={edges.onScroll}
      // Rounded here, not by the mobile drawer: see MobileSidebarContainer.
      className="flex flex-1 flex-col justify-between overflow-y-auto max-lg:rounded-b-lg"
    >
      <div className="flex flex-1 flex-col">
        <div className="bg-ui-bg-subtle sticky top-0 z-10">
          <WorkspaceSwitcher
            workspace={currentWorkspace}
            workspaces={workspaces}
          />
          <div className="px-3">
            <Divider variant="dashed" />
          </div>
          <ScrollEdgeBlur side="top" visible={edges.top} />
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex flex-1 flex-col">
            <CoreRouteSection />
          </div>
          <UtilitySection />
        </div>
        {/* Pinned with the user menu so the checklist stays in view while
            the nav scrolls on short screens. */}
        <div className="bg-ui-bg-subtle sticky bottom-0 z-10">
          <ScrollEdgeBlur side="bottom" visible={edges.bottom} />
          <GettingStartedNav />
          <UserSection />
        </div>
      </div>
    </aside>
  );
};

const Logout = () => {
  const { t } = useTranslation();
  //   const navigate = useNavigate();
  const logout = useLogout();
  //   const { mutateAsync: logoutMutation } = useLogout();

  const handleLogout = async () => {
    logout();
    // await logoutMutation(undefined, {
    //   onSuccess: () => {
    //     /**
    //      * When the user logs out, we want to clear the query cache
    //      */
    //     queryClient.clear();
    //     navigate("/login");
    //   },
    // });
  };

  return (
    <DropdownMenu.Item onClick={handleLogout}>
      <div className="flex items-center gap-x-2">
        <OpenRectArrowOut className="text-ui-fg-subtle" />
        <span>{t("app.menus.actions.logout")}</span>
      </div>
    </DropdownMenu.Item>
  );
};

const Searchbar = () => {
  const { t } = useTranslation();
  const setPaletteOpen = useSetAtom(commandPaletteOpenAtom);

  return (
    <div className="px-3">
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className={clx(
          "bg-ui-bg-subtle text-ui-fg-subtle flex w-full items-center gap-x-2.5 rounded-md px-2 py-1 outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus",
        )}
      >
        <MagnifyingGlass />
        <div className="flex-1 text-left">
          <Text size="small" leading="compact" weight="plus">
            {t("app.search.label")}
          </Text>
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          {commandPaletteShortcutLabel()}
        </Text>
      </button>
    </div>
  );
};
const DashboardItem = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  return (
    <NavItem
      label={t("dashboard.title")}
      icon={<House />}
      type="core"
      to={`/${workspaceSlug}/dashboard`}
    />
  );
};

const CoreRouteSection = () => {
  const coreRoutes = useCoreRoutes();

  return (
    <div className="flex flex-col">
      <NavHintPopover />
      <nav className="flex flex-col gap-y-1 py-3">
        <Searchbar />
        <DashboardItem />
        {coreRoutes.map((route) => {
          return <NavItem key={route.to} {...route} />;
        })}
      </nav>
      <Divider orientation="horizontal" variant="dashed" />
      <RecentAgentsSection />
    </div>
  );
};

export const UtilitySection = () => {
  const location = useLocation();
  const { workspaceSlug } = useWorkspaceParams();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-0.5 py-3">
      <NavItem
        label={t("app.nav.activity.header")}
        to={`/${workspaceSlug}/${ROUTES.Activities}`}
        from={location.pathname}
        type="extension"
        icon={<CursorArrowRays />}
      />
      <NavItem
        label={t("app.nav.main.storeSettings")}
        to={`/${workspaceSlug}/${ROUTES.Settings}`}
        from={location.pathname}
        type="extension"
        icon={<CogSixTooth />}
      />
    </div>
  );
};

const UserSection = () => {
  return (
    <div>
      <div className="px-3">
        <Divider variant="dashed" />
      </div>
      <UserMenu />
    </div>
  );
};
