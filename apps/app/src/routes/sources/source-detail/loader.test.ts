import type { LoaderFunctionArgs } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  flags: { orders: true, customerSources: true },
  ensure: vi.fn(async () => ({ id: "src-1" })),
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  loadFeatureFlags: async () => state.flags,
}));
vi.mock("@/hooks/api/tracked-links", () => ({
  trackedLinkDetailQueryOptions: (slug: string, id: string) => ({
    queryKey: ["tracked-links", slug, id],
  }),
}));
vi.mock("@/libs/query-client", () => ({
  default: { ensureQueryData: state.ensure },
}));

import { sourceDetailLoader } from "./loader";

const args = {
  params: { workspaceSlug: "lumi", sourceId: "src-1" },
} as unknown as LoaderFunctionArgs;

describe("sourceDetailLoader", () => {
  afterEach(() => {
    state.flags.customerSources = true;
    state.ensure.mockClear();
  });

  it("loads the source while Nguồn khách is on", async () => {
    await expect(sourceDetailLoader(args)).resolves.toEqual({ id: "src-1" });
  });

  it("skips the request while Nguồn khách is off", async () => {
    state.flags.customerSources = false;

    await expect(sourceDetailLoader(args)).resolves.toBeNull();
    expect(state.ensure).not.toHaveBeenCalled();
  });
});
