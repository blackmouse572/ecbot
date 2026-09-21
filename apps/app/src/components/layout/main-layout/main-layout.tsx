import { useWorkspace } from "@/hooks/api/workspace";
import {
  AcademicCap,
  BellAlert,
  ChatBubbleLeftRight,
  CogSixTooth,
  CursorArrowRays,
  EllipsisHorizontal,
  SquaresPlus,
  FolderOpen,
  House,
  MagnifyingGlass,
  OpenRectArrowOut,
  PlusMini,
  Puzzle,
  Sparkles,
  Users,
} from "@medusajs/icons";
import { BlockedAccountsBadge } from "./blocked-accounts-badge";
import { RecentAgentsSection } from "./recent-agents-section";
import { PausedConversationsBadge } from "./paused-conversations-badge";
import { PendingSuggestionsBadge } from "./pending-suggestions-badge";
import { ToolsAttentionBadge } from "./tools-attention-badge";
import { Avatar, Divider, DropdownMenu, Text, clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { LogoBoxSpinner, Skeleton } from "@repo/ui/common-components";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { NavItem, Shell, type INavItem } from "@repo/ui/layout";
import { UserMenu } from "../user-menu";
import { NotificationMenu } from "../notification-menu/notification-menu";

import { useLogout } from "@/hooks/api";
import { useEnsureWorkspace, useWorkspaceList } from "@/hooks/api/workspace";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useWorkspaceAbilities } from "@/modules/auth";
import { ROUTES } from "@/routes";
import type { WorkSpaceGetResponseDto } from "@repo/client";

export const MainLayout = () => {
  const { t } = useTranslation();
  // Ensure we have a valid workspace
  const { workspace, isLoading, hasWorkspaces } = useEnsureWorkspace();
  const { workspaces } = useWorkspaceList();
  if (isLoading) {
    return <LogoBoxSpinner />;
  }

  if (!hasWorkspaces) {
    return <Navigate to={ROUTES.Onboard} replace />;
  }

  return (
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
  );
};

interface MainSidebarProps {
  workspaces: WorkSpaceGetResponseDto[];
  currentWorkspace: WorkSpaceGetResponseDto;
}

const MainSidebar = ({ workspaces, currentWorkspace }: MainSidebarProps) => {
  return (
    <aside className="flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="flex flex-1 flex-col">
        <div className="bg-ui-bg-subtle sticky top-0">
          <Header workspace={currentWorkspace} workspaces={workspaces} />
          <div className="px-3">
            <Divider variant="dashed" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex flex-1 flex-col">
            <CoreRouteSection />
          </div>
          <UtilitySection />
        </div>
        <div className="bg-ui-bg-subtle sticky bottom-0">
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

const Header = ({ workspace, workspaces: _workspaces }: HeaderProps) => {
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
          <EllipsisHorizontal className="text-ui-fg-muted" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Content className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
          <DropdownMenu.Item
            className="flex items-center gap-x-3 px-2 py-1"
            onClick={() =>
              navigate(
                `/${workspace.slug}/${ROUTES.Settings}/${ROUTES.Workspace}`,
              )
            }
          >
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
          </DropdownMenu.Item>

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

          {/* Settings */}
          {isWorkspaceOwner && (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.Item className="gap-x-2" asChild>
                <Link
                  to={`/${workspace.slug}/${ROUTES.Settings}/${ROUTES.Workspace}/edit`}
                >
                  <CogSixTooth className="text-ui-fg-subtle" />
                  {t("app.nav.main.storeSettings")}
                </Link>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};

const useCoreRoutes = (): Omit<INavItem, "pathname">[] => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const baseUrl = `/${workspace?.slug}`;

  return [
    {
      label: t("channels.title"),
      to: `${baseUrl}/${ROUTES.Accounts}`,
      icon: <SquaresPlus />,
      ability: {
        action: "manage",
        subject: "ACCOUNT",
      },
      badge: <BlockedAccountsBadge />,
    },
    {
      label: t("customers.title"),
      to: `${baseUrl}/${ROUTES.CustomerTags}`,
      icon: <Users />,
      ability: {
        action: "manage",
        subject: "CUSTOMER",
      },
      items: [
        {
          label: t("settings.customerTags.title"),
          to: `${baseUrl}/${ROUTES.CustomerTags}`,
        },
        {
          label: t("customers.suggestions.nav.label"),
          to: `${baseUrl}/${ROUTES.CustomerSuggestions}`,
          ability: {
            action: "manage",
            subject: "CUSTOMER",
          },
          badge: <PendingSuggestionsBadge />,
        },
      ],
    },
    {
      label: t("conversations.title"),
      to: `${baseUrl}/${ROUTES.Conversations}`,
      icon: <ChatBubbleLeftRight />,
      ability: {
        action: "manage",
        subject: "CHATBOT",
      },
      badge: <PausedConversationsBadge />,
    },
    {
      label: t("agents.title"),
      to: `${baseUrl}/${ROUTES.Chatbot}`,
      icon: <Sparkles />,
      ability: {
        action: "manage",
        subject: "CHATBOT",
      },
      items: [
        {
          label: t("knowledgeBase.title"),
          to: `${baseUrl}/${ROUTES.KnowledgeBase}`,
          icon: <FolderOpen />,
          ability: {
            action: "manage",
            subject: "KNOWLEDGE_BASE",
          },
        },
        {
          label: t("tools.title"),
          to: `${baseUrl}/${ROUTES.Tools}`,
          icon: <Puzzle />,
          ability: {
            action: "manage",
            subject: "TOOL",
          },
          badge: <ToolsAttentionBadge />,
        },
        {
          label: t("skills.title"),
          to: `${baseUrl}/${ROUTES.Skills}`,
          icon: <AcademicCap />,
          ability: {
            action: "read",
            subject: "SKILL",
          },
        },
        {
          label: t("followups.title"),
          to: `${baseUrl}/${ROUTES.Followups}`,
          icon: <BellAlert />,
          ability: {
            action: "read",
            subject: "CHATBOT",
          },
        },
      ],
    },
  ];
};

const Searchbar = () => {
  const { t } = useTranslation();

  return (
    <div className="px-3">
      <button
        type="button"
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
          ⌘K
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
