import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCoreRoutes } from "./use-core-routes";
import { useMarketingRoutes } from "./use-marketing-routes";

const flags = vi.hoisted(() => ({ orders: true, customerSources: true }));
vi.mock("@/hooks/api/feature-flags", () => ({
  useFeatureFlags: () => ({ flags, isLoading: false, isError: false }),
}));
vi.mock("@/hooks/api/workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "lumi" } }),
}));

const paths = (items: { to: string }[]) => items.map((item) => item.to);

describe("flagged nav items", () => {
  afterEach(() => {
    flags.orders = true;
    flags.customerSources = true;
  });

  it("lists Đơn hàng and Nguồn khách while their flags are on", () => {
    expect(paths(renderHook(useCoreRoutes).result.current)).toContain(
      "/lumi/orders",
    );
    expect(paths(renderHook(useMarketingRoutes).result.current)).toEqual([
      "/lumi/sources",
    ]);
  });

  it("drops each one while its flag is off", () => {
    flags.orders = false;
    flags.customerSources = false;

    expect(paths(renderHook(useCoreRoutes).result.current)).not.toContain(
      "/lumi/orders",
    );
    expect(renderHook(useMarketingRoutes).result.current).toEqual([]);
  });
});
