import type { LoaderFunctionArgs, UIMatch } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  on: { orders: true, customerSources: false } as Record<string, boolean>,
  loaded: [] as Array<string | undefined>,
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  isFeatureOn: (slug: string | undefined, flag: string) =>
    slug === "lumi" && state.on[flag],
  loadFeatureFlags: async (slug: string | undefined) => {
    state.loaded.push(slug);
    return state.on;
  },
}));

import { featureBreadcrumb, featureRouteLoader } from "./feature-route-handle";

const match = { params: { workspaceSlug: "lumi" } } as unknown as UIMatch;

describe("feature route handle", () => {
  afterEach(() => {
    state.loaded = [];
  });

  it("titles the section while its flag is on", () => {
    expect(featureBreadcrumb("orders", () => "Orders")(match)).toBe("Orders");
  });

  it("leaves the not-found page without the section's title while its flag is off", () => {
    expect(
      featureBreadcrumb("customerSources", () => "Sources")(match),
    ).toBeNull();
  });

  it("loads the flags before the section renders", async () => {
    await featureRouteLoader({
      params: { workspaceSlug: "lumi" },
    } as unknown as LoaderFunctionArgs);

    expect(state.loaded).toEqual(["lumi"]);
  });
});
