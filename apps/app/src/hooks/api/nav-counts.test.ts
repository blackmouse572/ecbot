import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const { navCount } = vi.hoisted(() => ({ navCount: vi.fn() }));

vi.mock("@repo/client", () => ({
  navCountWorkspaceControllerGetV1: navCount,
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "w" } }),
}));

import { useNavCounts } from "./nav-counts";

const wrapperWith =
  (client: QueryClient) =>
  ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);

describe("useNavCounts", () => {
  it("unwraps the workspace counts from the response envelope", async () => {
    navCount.mockResolvedValue({
      data: {
        data: {
          pendingSuggestions: 5,
          accountsNeedingAttention: 2,
          toolsNeedingAttention: 1,
        },
      },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useNavCounts(), {
      wrapper: wrapperWith(client),
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        pendingSuggestions: 5,
        accountsNeedingAttention: 2,
        toolsNeedingAttention: 1,
      }),
    );
    expect(navCount).toHaveBeenCalledWith({ path: { workspace: "w" } });
  });

  it("falls back to zeros before the request resolves", () => {
    navCount.mockReturnValue(new Promise(() => {}));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useNavCounts(), {
      wrapper: wrapperWith(client),
    });

    expect(result.current).toEqual({
      pendingSuggestions: 0,
      accountsNeedingAttention: 0,
      toolsNeedingAttention: 0,
    });
  });
});
