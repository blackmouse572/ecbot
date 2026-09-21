import type { RouteObject } from "react-router-dom";

// Enterprise overlay: `src/ee/` is gitignored in the public repo and materialised
// only by the enterprise build. Vite resolves the glob at transform time — with
// no match it is `{}` and nothing here reaches the bundle.
const modules = import.meta.glob<{ default: RouteObject[] }>(
  "../ee/**/routes.tsx",
  { eager: true },
);

if (
  import.meta.env.VITE_ECCHO_EDITION === "enterprise" &&
  Object.keys(modules).length === 0
) {
  throw new Error(
    "VITE_ECCHO_EDITION=enterprise but apps/app/src/ee/**/routes.tsx matched nothing — the overlay was not materialised",
  );
}

export function enterpriseRoutes(): RouteObject[] {
  return Object.keys(modules)
    .sort()
    .flatMap((key) => {
      const routes = modules[key].default;
      if (!Array.isArray(routes)) {
        throw new Error(`${key} must default-export RouteObject[]`);
      }
      return routes;
    });
}
