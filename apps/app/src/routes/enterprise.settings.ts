import type { TFunction } from "i18next";
import type { RouteObject } from "react-router-dom";
import type { EnterpriseNavItem, NavItem } from "./enterprise.nav";

// Enterprise overlay: `src/ee/` is gitignored in the public repo and materialised
// only by the enterprise build. Vite resolves the globs at transform time — with
// no match they are `{}` and nothing here reaches the bundle. A module adds a
// workspace settings page with a `settings-routes.tsx` (default-exporting
// RouteObject[], spread into the `:workspaceSlug/settings` children) and a
// `settings-nav.tsx` (default-exporting its sidebar entry, built like an
// `EnterpriseNavItem` with `baseUrl` = `/<slug>/settings`).
const routeModules = import.meta.glob<{ default: RouteObject[] }>(
  "../ee/**/settings-routes.tsx",
  { eager: true },
);
const navModules = import.meta.glob<{ default: EnterpriseNavItem }>(
  "../ee/**/settings-nav.tsx",
  { eager: true },
);

// A sidebar entry with no page behind it opens Not Found: fail the build's
// boot instead, naming what is missing.
if (
  Object.keys(navModules).length > 0 &&
  Object.keys(routeModules).length === 0
) {
  throw new Error(
    "apps/app/src/ee/**/settings-nav.tsx matched but settings-routes.tsx matched nothing — the settings pages were not materialised",
  );
}

export function enterpriseSettingsRoutes(): RouteObject[] {
  return Object.keys(routeModules)
    .sort()
    .flatMap((key) => {
      const routes = routeModules[key].default;
      if (!Array.isArray(routes)) {
        throw new Error(`${key} must default-export RouteObject[]`);
      }
      return routes;
    });
}

export function enterpriseSettingsNavItems(ctx: {
  t: TFunction;
  baseUrl: string;
}): NavItem[] {
  return Object.keys(navModules)
    .sort()
    .map((key) => navModules[key].default(ctx));
}
