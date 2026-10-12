import type { ComponentType } from "react";

// Enterprise overlay: `src/ee/` is gitignored in the public repo and materialised
// only by the enterprise build. Vite resolves the glob at transform time — with
// no match it is `{}` and nothing here reaches the bundle. One `user-section.tsx`
// per enterprise module, default-exporting the component to render above the
// sidebar's user badge.
const modules = import.meta.glob<{ default: ComponentType }>(
  "../ee/**/user-section.tsx",
  { eager: true },
);

export function enterpriseUserSection(): ComponentType[] {
  return Object.keys(modules)
    .sort()
    .map((key) => modules[key].default);
}
