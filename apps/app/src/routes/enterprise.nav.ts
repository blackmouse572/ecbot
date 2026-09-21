import type { WorkspaceNavItem } from "@/components/layout/main-layout/main-layout";
import type { TFunction } from "i18next";

export type NavItem = WorkspaceNavItem;

export type EnterpriseNavItem = (ctx: {
  t: TFunction;
  baseUrl: string;
}) => NavItem;

// Enterprise overlay: `src/ee/` is gitignored in the public repo and materialised
// only by the enterprise build. Vite resolves the glob at transform time — with
// no match it is `{}` and nothing here reaches the bundle. One `nav.tsx` per
// enterprise module, default-exporting a function that builds its own nav item.
const modules = import.meta.glob<{ default: EnterpriseNavItem }>(
  "../ee/**/nav.tsx",
  { eager: true },
);

export function enterpriseNavItems(ctx: {
  t: TFunction;
  baseUrl: string;
}): NavItem[] {
  return Object.keys(modules)
    .sort()
    .map((key) => modules[key].default(ctx));
}
