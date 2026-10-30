import type { TFunction } from "i18next";
import type { RouteObject } from "react-router-dom";
import type { NavItem } from "./enterprise.nav";

/** Builds one workspace settings sidebar entry under `baseUrl` (`/<slug>/settings`). */
export type EnterpriseSettingsNavItem = (ctx: {
  t: TFunction;
  baseUrl: string;
}) => NavItem;

// Enterprise overlay: `src/ee/` is gitignored in the public repo and materialised
// only by the enterprise build. Vite resolves the globs at transform time — with
// no match they are `{}` and nothing here reaches the bundle. A module adds a
// workspace settings page with a `settings-routes.tsx` (default-exporting
// RouteObject[], spread into the `:workspaceSlug/settings` children) and a
// `settings-nav.tsx` (default-exporting its sidebar entry).
const routeModules = import.meta.glob<{ default: RouteObject[] }>(
  "../ee/**/settings-routes.tsx",
  { eager: true },
);
const navModules = import.meta.glob<{ default: EnterpriseSettingsNavItem }>(
  "../ee/**/settings-nav.tsx",
  { eager: true },
);

export function enterpriseSettingsRoutes(): RouteObject[] {
  return Object.keys(routeModules)
    .sort()
    .flatMap((key) => routeModules[key].default);
}

export function enterpriseSettingsNavItems(ctx: {
  t: TFunction;
  baseUrl: string;
}): NavItem[] {
  return Object.keys(navModules)
    .sort()
    .map((key) => navModules[key].default(ctx));
}
