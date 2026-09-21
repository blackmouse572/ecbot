import type { RouteObject } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { enterpriseRoutes } from "./enterprise.routes";
import { getRouteMaps } from "./route";

function flattenRoutePaths(routes: RouteObject[], prefix: string): string[] {
  return routes.flatMap((route) => {
    const segment = (route.path ?? "").split("/").filter(Boolean).join("/");
    const full = [prefix, segment].filter(Boolean).join("/");

    if (route.children && route.children.length > 0) {
      return flattenRoutePaths(route.children, full);
    }
    return [full === "" ? "/" : `/${full}`];
  });
}

describe("route map — public table", () => {
  // `vi.mock` nothing: with `src/ee/` absent, `import.meta.glob` in
  // enterprise.routes.ts resolves to `{}` under vitest same as under Vite.
  it("has no enterprise routes when src/ee/ is absent", () => {
    expect(enterpriseRoutes()).toEqual([]);
  });

  it("matches the path list captured from main before the enterprise seam", () => {
    const paths = flattenRoutePaths(getRouteMaps(), "").sort();
    expect(paths).toMatchSnapshot();
  });
});
