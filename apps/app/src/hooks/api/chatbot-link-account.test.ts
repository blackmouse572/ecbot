import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/client", () => ({
  chatbotControllerLinkAccountV1: vi.fn(async () => ({ data: {} })),
  chatbotControllerUnlinkAccountV1: vi.fn(async () => ({ data: {} })),
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "w" } }),
}));

import { accountQueryKeys } from "./accounts";
import { useLinkChatbotAccount, useUnlinkChatbotAccount } from "./chatbot";

const wrapperWith = (client: QueryClient) => {
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

// The "Use an existing channel" list (accountQueryKeys.listUnlinked) is
// nested under accountQueryKeys.lists(), so invalidating the account lists
// after a chatbot link/unlink is what makes a just-used account disappear
// from it (and a just-unlinked one reappear) without a manual refresh.
describe("useLinkChatbotAccount / useUnlinkChatbotAccount", () => {
  it("invalidates the account lists after linking, so the unlinked list refreshes", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(accountQueryKeys.listUnlinked(), { data: [{ id: "a1" }] });

    const { result } = renderHook(() => useLinkChatbotAccount("bot-1"), { wrapper: wrapperWith(client) });
    result.current.mutate({ accounts: ["a1"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryState(accountQueryKeys.listUnlinked())?.isInvalidated).toBe(true);
  });

  it("invalidates the account lists after unlinking, so the unlinked list refreshes", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(accountQueryKeys.listUnlinked(), { data: [] });

    const { result } = renderHook(() => useUnlinkChatbotAccount("bot-1"), { wrapper: wrapperWith(client) });
    result.current.mutate({ accounts: ["a1"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryState(accountQueryKeys.listUnlinked())?.isInvalidated).toBe(true);
  });
});
