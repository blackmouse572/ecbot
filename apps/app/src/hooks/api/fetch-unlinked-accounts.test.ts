import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const findUnlinked = vi.fn();

vi.mock("@repo/client", () => ({
  accountControllerFindUnlinkedAccountsV1: (...args: unknown[]) => findUnlinked(...args),
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { id: "ws-1" } }),
}));

import { useFetchUnlinkedAccounts } from "./accounts";

const wrapper = ({ children }: PropsWithChildren) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
};

describe("useFetchUnlinkedAccounts", () => {
  it("always hits the network, ignoring any cached unlinked-accounts data", async () => {
    findUnlinked
      .mockResolvedValueOnce({ data: { data: [{ id: "a1" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "a1" }, { id: "a2" }] } });

    const { result } = renderHook(() => useFetchUnlinkedAccounts(), { wrapper });

    const first = await result.current();
    expect(first?.data).toEqual([{ id: "a1" }]);

    // A second call right after must hit the network again (fresh), not
    // return the same cached page — this is what the no-stealing check
    // relies on to see an account another user just linked elsewhere.
    const second = await result.current();
    expect(second?.data).toEqual([{ id: "a1" }, { id: "a2" }]);
    expect(findUnlinked).toHaveBeenCalledTimes(2);
  });
});
