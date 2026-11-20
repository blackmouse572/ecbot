import queryClient from "@/libs/query-client";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@repo/client", () => ({
  featureFlagWorkspaceControllerGetV1: api.get,
}));
vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "lumi" } }),
}));

import {
  featureFlagsQueryOptions,
  isFeatureOn,
  loadFeatureFlags,
} from "./feature-flags";

describe("feature flags", () => {
  afterEach(() => {
    queryClient.clear();
    api.get.mockReset();
    vi.useRealTimers();
  });

  it("retries and refetches on focus and reconnect, so a blip does not hide a feature", () => {
    expect(featureFlagsQueryOptions("lumi")).toMatchObject({
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  });

  it("loads the flags into the cache for breadcrumbs to read", async () => {
    api.get.mockResolvedValue({
      data: { data: { orders: true, customerSources: false } },
    });

    await expect(loadFeatureFlags("lumi")).resolves.toEqual({
      orders: true,
      customerSources: false,
    });
    expect(isFeatureOn("lumi", "orders")).toBe(true);
    expect(isFeatureOn("lumi", "customerSources")).toBe(false);
  });

  it("reads every flag as off once the load has failed after its retries", async () => {
    vi.useFakeTimers();
    api.get.mockRejectedValue(new Error("offline"));

    const flags = loadFeatureFlags("lumi");
    await vi.runAllTimersAsync();

    await expect(flags).resolves.toEqual({
      orders: false,
      customerSources: false,
      marketing: false,
    });
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(isFeatureOn("lumi", "orders")).toBe(false);
  });

  it("reads a flag as off before it is loaded", () => {
    expect(isFeatureOn("lumi", "orders")).toBe(false);
    expect(isFeatureOn(undefined, "orders")).toBe(false);
  });
});
