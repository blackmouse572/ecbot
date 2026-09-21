import { ArrowUturnLeft } from "@medusajs/icons";
import { clx, Divider, Text } from "@medusajs/ui";
import {
  LogoBoxSpinner,
  SidebarCollapsibleSection,
} from "@repo/ui/common-components";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation } from "react-router-dom";

import { useEnsureWorkspace } from "@/hooks/api/workspace";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";

import { type INavItem, NavItem, Shell } from "@repo/ui/layout";
import { UserMenu } from "../user-menu";
import { NotificationMenu } from "../notification-menu/notification-menu";

export const WorkspaceSettingsLayout = () => {
  const { t } = useTranslation();
  const { isLoading, hasWorkspaces } = useEnsureWorkspace();

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
      <WorkspaceSettingsSidebar />
    </Shell>
  );
};

const useWorkspaceSettingsRoutes = (): INavItem[] => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const base = `/${workspaceSlug}/${ROUTES.Settings}`;

  return useMemo(
    () => [
      {
        label: t("workspace.title"),
        to: `${base}/${ROUTES.Workspace}`,
      },
      {
        label: t("app.nav.members.header"),
        to: `${base}/${ROUTES.WorkspaceMember}`,
        items: [
          {
            label: t("members.invitations.title"),
            to: `${base}/${ROUTES.WorkspaceMember}/${ROUTES.Invitations}`,
          },
          {
            label: t("members.joinRequests.title"),
            to: `${base}/${ROUTES.WorkspaceMember}/${ROUTES.JoinRequests}`,
          },
        ],
      },
      {
        label: t("app.nav.roles.header"),
        to: `${base}/${ROUTES.WorkspaceRoles}`,
      },
    ],
    [t, base],
  );
};

const useApiKeyRoutes = (): INavItem[] => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const base = `/${workspaceSlug}/${ROUTES.Settings}`;

  return useMemo(
    () => [
      {
        label: t("settings.clientCredentials.title"),
        to: `${base}/${ROUTES.ClientCredentials}`,
      },
    ],
    [t, base],
  );
};

const WorkspaceSettingsSidebar = () => {
  const { t } = useTranslation();
  const workspaceRoutes = useWorkspaceSettingsRoutes();
  const apiKeyRoutes = useApiKeyRoutes();

  return (
    <aside className="relative flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="bg-ui-bg-subtle sticky top-0">
        <Header />
        <div className="flex items-center justify-center px-3">
          <Divider variant="dashed" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <SidebarCollapsibleSection label={t("workspace.title")}>
            <nav className="flex flex-col gap-y-0.5">
              {workspaceRoutes.map((setting) => (
                <NavItem key={setting.to} type="setting" {...setting} />
              ))}
            </nav>
          </SidebarCollapsibleSection>
          <div className="flex items-center justify-center px-3">
            <Divider variant="dashed" />
          </div>
          <SidebarCollapsibleSection
            label={t("settings.clientCredentials.title")}
          >
            <nav className="flex flex-col gap-y-0.5">
              {apiKeyRoutes.map((setting) => (
                <NavItem key={setting.to} type="setting" {...setting} />
              ))}
            </nav>
          </SidebarCollapsibleSection>
        </div>
        <div className="bg-ui-bg-subtle sticky bottom-0">
          <UserSection />
        </div>
      </div>
    </aside>
  );
};

const Header = () => {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const { t } = useTranslation();
  const location = useLocation();
  const { workspaceSlug } = useWorkspaceParams();

  const dashboard = `/${workspaceSlug}/${ROUTES.Dashboard}`;

  useEffect(() => {
    const state = location.state?.from as string | undefined;
    // A `from` pointing back into workspace settings would loop the back
    // button inside this layout instead of exiting it.
    setFrom(
      state && !state.startsWith(`/${workspaceSlug}/${ROUTES.Settings}`)
        ? state
        : undefined,
    );
  }, [location, workspaceSlug]);

  return (
    <div className="bg-ui-bg-subtle p-3">
      <Link
        to={from ?? dashboard}
        replace
        className={clx(
          "bg-ui-bg-subtle transition-fg flex items-center rounded-md outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus",
        )}
      >
        <div className="flex items-center gap-x-2.5 px-2 py-1">
          <div className="flex items-center justify-center">
            <ArrowUturnLeft className="text-ui-fg-subtle" />
          </div>
          <Text leading="compact" weight="plus" size="small">
            {t("app.nav.settings.header")}
          </Text>
        </div>
      </Link>
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
