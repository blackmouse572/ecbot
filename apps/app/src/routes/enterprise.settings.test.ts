import { describe, expect, it } from "vitest";
import {
  enterpriseSettingsNavItems,
  enterpriseSettingsRoutes,
} from "./enterprise.settings";

// Deliberately does NOT assert empty arrays: in the enterprise tree the
// overlay is materialised and the globs match, so `[]` would fail there.
describe("enterprise workspace settings", () => {
  it("returns route objects whether or not the overlay is materialised", () => {
    const routes = enterpriseSettingsRoutes();
    expect(Array.isArray(routes)).toBe(true);
    for (const route of routes) {
      expect(typeof route.path).toBe("string");
    }
  });

  it("builds nav items under the workspace settings base", () => {
    const items = enterpriseSettingsNavItems({
      t: ((key: string) => key) as never,
      baseUrl: "/acme/settings",
    });
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(item.to.startsWith("/acme/settings/")).toBe(true);
    }
  });
});
