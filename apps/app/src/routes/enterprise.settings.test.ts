import { describe, expect, it } from "vitest";
import {
  enterpriseSettingsNavItems,
  enterpriseSettingsRoutes,
} from "./enterprise.settings";

// Same convention as route.test.tsx: `vi.mock` nothing, so with `src/ee/`
// absent both globs resolve to `{}` under vitest as under Vite.
describe("enterprise workspace settings", () => {
  it("has no settings pages or sidebar entries when src/ee/ is absent", () => {
    expect(enterpriseSettingsRoutes()).toEqual([]);
    expect(
      enterpriseSettingsNavItems({
        t: ((key: string) => key) as never,
        baseUrl: "/acme/settings",
      }),
    ).toEqual([]);
  });
});
