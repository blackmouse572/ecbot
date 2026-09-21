import { ArrowUturnLeft } from "@medusajs/icons";
import { clx, Divider, Text } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { SidebarCollapsibleSection } from "@repo/ui/common-components";

import { type INavItem, NavItem, Shell } from "@repo/ui/layout";
import { UserMenu } from "../user-menu";
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
    [t]
  );
};
const useSubscriptionRoutes = (): INavItem[] => {
  const { t } = useTranslation();

  return useMemo<INavItem[]>(
    () => [
      {
        label: t("subscription.domain"),
        to: "/settings/subscription",
      },
      {
        label: t("billing.domain"),
        to: "/settings/billing",
      },
    ],
    [t]
  );
};

/**
 * Ensure that the `from` prop is not another settings route, to avoid
 * the user getting stuck in a navigation loop.
 */
const getSafeFromValue = (from: string) => {
  if (from.startsWith("/settings")) {
    return "/settings/profile";
  }

  return from;
};

const SettingsSidebar = () => {
  const myAccountRoutes = useMyAccountRoutes();
  const subscriptionRoutes = useSubscriptionRoutes();

  const { t } = useTranslation();

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
          <SidebarCollapsibleSection label={t("app.nav.settings.myAccount")}>
            <nav className="flex flex-col gap-y-0.5">
              {myAccountRoutes.map((setting) => (
                <NavItem key={setting.to} type="setting" {...setting} />
              ))}
            </nav>
          </SidebarCollapsibleSection>
          <div className="flex items-center justify-center px-3">
            <Divider variant="dashed" />
          </div>
          <SidebarCollapsibleSection label={t("app.nav.settings.subscription")}>
            <nav className="flex flex-col gap-y-0.5">
              {subscriptionRoutes.map((setting) => (
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
  const [from, setFrom] = useState("/");

  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.from) {
      setFrom(getSafeFromValue(location.state.from));
    }
  }, [location]);

  return (
    <div className="bg-ui-bg-subtle p-3">
      <Link
        to={from}
        replace
        className={clx(
          "bg-ui-bg-subtle transition-fg flex items-center rounded-md outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus"
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
