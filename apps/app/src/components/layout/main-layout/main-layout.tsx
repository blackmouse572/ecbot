import {
  ChevronUpDown,
  CogSixTooth,
  CursorArrowRays,
  House,
  MagnifyingGlass,
  OpenRectArrowOut,
  PlusMini,
} from "@medusajs/icons";
import { GuideMoments } from "@/components/guide";
import { GettingStartedNav } from "@/routes/dashboard/components/getting-started-nav/getting-started-nav";
import { RecentAgentsSection } from "./recent-agents-section";
import { ScrollEdgeBlur } from "./scroll-edge-blur";
import { Avatar, Divider, DropdownMenu, Text, clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { LogoBoxSpinner, Skeleton } from "@repo/ui/common-components";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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

import { useLogout } from "@/hooks/api";
import { useEnsureWorkspace, useWorkspaceList } from "@/hooks/api/workspace";
import { useScrollEdges } from "@/hooks/use-scroll-edges";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useWorkspaceAbilities } from "@/modules/auth";
import { ROUTES } from "@/routes";
import { WorkspaceSuspended } from "./workspace-suspended";
import { workspaceSettingsPath } from "@/libs/workspace-settings-path";
import type { WorkSpaceGetResponseDto } from "@repo/client";

// The type of the nested nav entries used in the workspace nav group below
// (e.g. the `items` under the agents/chatbot entry) — exported so the
// enterprise overlay (apps/app/src/routes/enterprise.nav.ts) can type its
// contributed items against the exact same shape.
export type WorkspaceNavItem = NonNullable<INavItem["items"]>[number];

export const MainLayout = () => {
  const { t } = useTranslation();
  // Ensure we have a valid workspace
  const { workspace, isLoading, hasWorkspaces, isSuspended } =
    useEnsureWorkspace();
  const { workspaces } = useWorkspaceList();
  const { workspaceSlug } = useWorkspaceParams();
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
          <Header workspace={currentWorkspace} workspaces={workspaces} />
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
          <WorkspaceSettingsItem />
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

interface HeaderProps {
  workspace: WorkSpaceGetResponseDto;
  workspaces: WorkSpaceGetResponseDto[];
}

export const Header = ({ workspace, workspaces: _workspaces }: HeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isWorkspaceOwner } = useWorkspaceAbilities();

  const handleWorkspaceSelect = (slug: string) => {
    if (workspace.slug === slug) return;

    // Use the current path and replace the workspace slug
    const currentPath = location.pathname;
    const basePath = currentPath.startsWith(`/${workspace.slug}`)
      ? currentPath.substring(workspace.slug.length + 1) // +1 for the slash
      : "";

    // Navigate to the new workspace with the same relative path
    navigate(`/${slug}${basePath ? `${basePath}` : ""}`);
  };
  const workspaces = _workspaces.filter((ws) => ws.id !== workspace.id);

  return (
    <div className="w-full p-3">
      <DropdownMenu>
        <DropdownMenu.Trigger
          className={clx(
            "bg-ui-bg-subtle transition-fg grid w-full grid-cols-[24px_1fr_15px] items-center gap-x-3 rounded-md p-0.5 pr-2 outline-none",
            "hover:bg-ui-bg-subtle-hover",
            "data-[state=open]:bg-ui-bg-subtle-hover",
            "focus-visible:shadow-borders-focus",
          )}
        >
          <Avatar
            variant="squared"
            size="xsmall"
            fallback={workspace.name.substring(0, 2).toUpperCase()}
            src={workspace.avatar}
          />
          <div className="block overflow-hidden text-left">
            {workspace.name ? (
              <Text
                size="small"
                weight="plus"
                leading="compact"
                className="truncate"
              >
                {workspace.name}
              </Text>
            ) : (
              <Skeleton className="h-[9px] w-[120px]" />
            )}
          </div>
          <ChevronUpDown className="text-ui-fg-muted" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Content className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
          {/* The current workspace, shown as a label: Settings below is its only link. */}
          <div className="flex items-center gap-x-3 px-2 py-1">
            <Avatar
              variant="squared"
              size="small"
              fallback={workspace.name.substring(0, 2).toUpperCase()}
              src={workspace.avatar}
            />
            <div className="flex flex-col overflow-hidden">
              <Text
                size="small"
                weight="plus"
                leading="compact"
                className="truncate"
              >
                {workspace.name}
              </Text>
            </div>
          </div>
          {isWorkspaceOwner && (
            <DropdownMenu.Item className="gap-x-2" asChild>
              <Link
                to={workspaceSettingsPath(workspace.slug)}
                state={{ from: location.pathname }}
              >
                <CogSixTooth className="text-ui-fg-subtle" />
                {t("app.nav.main.storeSettings")}
              </Link>
            </DropdownMenu.Item>
          )}

          {/* Workspaces List */}
          {workspaces.length > 0 && (
            <>
              <DropdownMenu.Separator />
              <div className="max-h-56 overflow-y-auto">
                {workspaces.map((ws) => (
                  <DropdownMenu.Item
                    key={ws.id}
                    className={clx(
                      "gap-x-2",
                      ws.id === workspace.id && "bg-ui-bg-base-hover",
                    )}
                    onClick={() => handleWorkspaceSelect(ws.slug)}
                  >
                    <Avatar
                      variant="squared"
                      size="xsmall"
                      fallback={ws.name.substring(0, 2).toUpperCase()}
                      src={ws.avatar}
                    />
                    {ws.name}
                  </DropdownMenu.Item>
                ))}
              </div>
            </>
          )}

          {/* Create workspace */}
          <DropdownMenu.Separator />
          <DropdownMenu.Item className="gap-x-2" asChild>
            <Link to={`/${ROUTES.Onboard}/${ROUTES.OnboardCreate}`}>
              <PlusMini className="text-ui-fg-subtle" />
              {t("onboard.select.create.label")}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
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

const UtilitySection = () => {
  const location = useLocation();
  const { workspaceSlug } = useWorkspaceParams();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-0.5 py-3">
      <NavItem
        label={t("app.nav.activity.header")}
        to={`/${workspaceSlug}/${ROUTES.Activities}`} // Direct link to workspace settings"
        from={location.pathname}
        type="extension"
        icon={<CursorArrowRays />}
      />
    </div>
  );
};

/** Pinned above the user menu so it stays in view on every page. */
export const WorkspaceSettingsItem = () => {
  const location = useLocation();
  const { workspaceSlug } = useWorkspaceParams();
  const { isWorkspaceOwner } = useWorkspaceAbilities();
  const { t } = useTranslation();

  if (!isWorkspaceOwner) return null;

  return (
    <nav className="flex flex-col pb-2">
      <NavItem
        label={t("app.nav.main.storeSettings")}
        to={workspaceSettingsPath(workspaceSlug)}
        from={location.pathname}
        type="core"
        icon={<CogSixTooth />}
      />
    </nav>
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
