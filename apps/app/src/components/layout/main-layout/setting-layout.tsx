import { ArrowUturnLeft } from "@medusajs/icons";
import { clx, Divider, Text } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { SidebarCollapsibleSection } from "@repo/ui/common-components";

import { type INavItem, NavItem, Shell } from "@repo/ui/layout";
import { UserMenu } from "../user-menu";
import {
  useResolvedWorkspaceSlug,
  useWorkspaceList,
} from "@/hooks/api/workspace";
import { ROUTES } from "@/routes/constants";
import { NotificationMenu } from "../notification-menu/notification-menu";

export const SettingsLayout = () => {
  const { t } = useTranslation();

  return (
    <Shell
      mobileNavLabels={{
        title: t("app.nav.accessibility.title"),
        description: t("app.nav.accessibility.description"),
      }}
      topbarActions={<NotificationMenu />}
    >
      <SettingsSidebar />
    </Shell>
  );
};

const useMyAccountRoutes = (): INavItem[] => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        label: t("profile.domain"),
        to: "/settings/profile",
      },
      {
        label: t("preferences.domain"),
        to: "/settings/preferences",
      },
      {
        label: t("changePassword.domain"),
        to: "/settings/change-password",
      },
      {
        label: t("sessions.domain"),
        to: "/settings/sessions",
      },
    ],
    [t],
  );
};
/**
 * Ensure that the `from` prop is not another settings route, to avoid
 * the user getting stuck in a navigation loop: those fall back to the
 * workspace the back link names.
 */
const getSafeFromValue = (from: string) =>
  from.startsWith("/settings") ? undefined : from;

const SettingsSidebar = () => {
  const myAccountRoutes = useMyAccountRoutes();

  const { t } = useTranslation();

  return (
    <aside className="relative flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="bg-ui-bg-subtle sticky top-0">
        <AccountSettingsHeader />
        <div className="flex items-center justify-center px-3">
          <Divider variant="dashed" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <SidebarCollapsibleSection label={t("app.nav.settings.myAccount")}>
            <nav className="flex flex-col gap-y-0.5">
              {myAccountRoutes.map((setting) => (
                <NavItem key={setting.to} type="setting" {...setting} />
              ))}
            </nav>
          </SidebarCollapsibleSection>
        </div>
        <div className="bg-ui-bg-subtle sticky bottom-0">
          <WorkspaceSettingsHint />
          <UserSection />
        </div>
      </div>
    </aside>
  );
};

/** The workspace the user last worked in, for the back link and the hint. */
const useLastWorkspace = () => {
  const { workspaces } = useWorkspaceList();
  const { slug } = useResolvedWorkspaceSlug();
  return workspaces.find((ws) => ws.slug === slug);
};

/** Account settings hold no workspace pages: point to where they live. */
export const WorkspaceSettingsHint = () => {
  const { t } = useTranslation();
  const workspace = useLastWorkspace();
  if (!workspace) return null;

  return (
    <Text size="xsmall" className="text-ui-fg-subtle px-5 pb-3">
      {t("settings.workspaceHint.text")}{" "}
      <Link
        to={`/${workspace.slug}/${ROUTES.Settings}/${ROUTES.Workspace}`}
        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
      >
        {t("settings.workspaceHint.link")}
      </Link>
    </Text>
  );
};

export const AccountSettingsHeader = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const workspace = useLastWorkspace();
  const [from, setFrom] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (location.state?.from) {
      setFrom(getSafeFromValue(location.state.from));
    }
  }, [location]);

  const fallback = workspace ? `/${workspace.slug}/${ROUTES.Dashboard}` : "/";

  return (
    <div className="bg-ui-bg-subtle p-3">
      <Link
        to={from ?? fallback}
        replace
        className={clx(
          "bg-ui-bg-subtle transition-fg flex items-center rounded-md outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus",
        )}
      >
        <div className="flex min-w-0 items-center gap-x-2.5 px-2 py-1">
          <ArrowUturnLeft className="text-ui-fg-subtle shrink-0" />
          <Text
            leading="compact"
            weight="plus"
            size="small"
            className="truncate"
          >
            {workspace
              ? t("settings.backTo", { name: workspace.name })
              : t("app.nav.settings.header")}
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
