import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";
import {
  CogSixTooth,
  CursorArrowRays,
  House,
  Key,
  User,
  UserGroup,
  Users,
} from "@medusajs/icons";
import { useNavAccess } from "@repo/ui/layout";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCoreRoutes } from "../main-layout/use-core-routes";
import type { CommandPaletteItem } from "./types";

/** Every page the sidebars link to, minus the ones the member may not open. */
export const useCommandPalettePages = (): CommandPaletteItem[] => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const coreRoutes = useCoreRoutes();
  const can = useNavAccess();

  return useMemo(() => {
    const base = `/${workspaceSlug}`;
    const settingsBase = `${base}/${ROUTES.Settings}`;
    const settingsHint = t("app.nav.main.storeSettings");

    const core = coreRoutes.flatMap((route) => {
      if (route.ability && !can(route.ability)) return [];
      const children = (route.items ?? [])
        .filter((item) => !item.ability || can(item.ability))
        .map((item) => ({
          id: item.to,
          label: item.label,
          icon: item.icon ?? route.icon,
          to: item.to,
        }));
      return [
        { id: route.to, label: route.label, icon: route.icon, to: route.to },
        ...children,
      ];
    });

    const settings = [
      {
        label: t("app.nav.main.storeSettings"),
        to: `${settingsBase}/${ROUTES.Workspace}`,
        icon: <CogSixTooth />,
      },
      {
        label: t("app.nav.members.header"),
        to: `${settingsBase}/${ROUTES.WorkspaceMember}`,
        icon: <Users />,
      },
      {
        label: t("app.nav.roles.header"),
        to: `${settingsBase}/${ROUTES.WorkspaceRoles}`,
        icon: <UserGroup />,
      },
      {
        label: t("settings.clientCredentials.title"),
        to: `${settingsBase}/${ROUTES.ClientCredentials}`,
        icon: <Key />,
      },
    ].map((page) => ({ ...page, id: page.to, hint: settingsHint }));

    return [
      {
        id: "dashboard",
        label: t("dashboard.title"),
        icon: <House />,
        to: `${base}/${ROUTES.Dashboard}`,
      },
      ...core,
      {
        id: "activities",
        label: t("app.nav.activity.header"),
        icon: <CursorArrowRays />,
        to: `${base}/${ROUTES.Activities}`,
      },
      ...settings,
      {
        id: "profile",
        label: t("app.menus.user.profileSettings"),
        icon: <User />,
        to: `/${ROUTES.Settings}/${ROUTES.Profile}`,
      },
    ];
  }, [t, workspaceSlug, coreRoutes, can]);
};
