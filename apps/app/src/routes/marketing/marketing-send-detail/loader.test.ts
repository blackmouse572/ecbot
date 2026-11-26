import type { LoaderFunctionArgs } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  flags: { marketing: true },
  ensure: vi.fn(async () => ({ id: "send-1" })),
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  loadFeatureFlags: async () => state.flags,
}));
vi.mock("@/hooks/api/marketing-sends", () => ({
  marketingSendQueryOptions: (slug: string, id: string) => ({
    queryKey: ["marketing-send", slug, id],
  }),
}));
vi.mock("@/libs/query-client", () => ({
  default: { ensureQueryData: state.ensure },
}));

import { marketingSendDetailLoader } from "./loader";

// SAFETY: the loader reads only params.
const args = {
  params: { workspaceSlug: "lumi", sendId: "send-1" },
} as unknown as LoaderFunctionArgs;

describe("marketingSendDetailLoader", () => {
  afterEach(() => {
    state.flags.marketing = true;
    state.ensure.mockClear();
  });

  it("loads the send while marketing is on", async () => {
    await expect(marketingSendDetailLoader(args)).resolves.toEqual({
      id: "send-1",
    });
  });

  it("skips the request while marketing is off", async () => {
    state.flags.marketing = false;

    await expect(marketingSendDetailLoader(args)).resolves.toBeNull();
    expect(state.ensure).not.toHaveBeenCalled();
  });
});
