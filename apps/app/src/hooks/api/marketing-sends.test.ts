import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const update = vi.hoisted(() =>
  vi.fn(async ({ path }: { path: { send: string } }) => {
    if (path.send === "once-1") throw new Error("marketingSend.error.notAuto");
    return { data: { data: {} } };
  }),
);

vi.mock("@repo/client", () => ({
  marketingSendWorkspaceControllerUpdateV1: update,
}));

import { useBatchSetMarketingSendsActive } from "./marketing-sends";

describe("useBatchSetMarketingSendsActive", () => {
  it("patches each send and counts which ones went through", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(
      () => useBatchSetMarketingSendsActive("lumi"),
      { wrapper },
    );
    const outcome = await result.current.mutateAsync({
      ids: ["auto-1", "once-1"],
      active: false,
    });

    expect(update).toHaveBeenCalledWith({
      path: { workspace: "lumi", send: "auto-1" },
      body: { active: false },
    });
    expect(outcome.succeeded).toEqual(["auto-1"]);
    expect(outcome.failed.map((row) => row.id)).toEqual(["once-1"]);
  });
});
