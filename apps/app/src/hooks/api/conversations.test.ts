import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const { reactToMessage, toastError, listMessages } = vi.hoisted(() => ({
  reactToMessage: vi.fn(),
  toastError: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock("@repo/client", () => ({
  conversationWorkspaceControllerReactToMessageV1: reactToMessage,
  conversationWorkspaceControllerListMessagesV1: listMessages,
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "w" } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { ...actual.toast, error: toastError },
  };
});

import {
  conversationQueryKeys,
  useConversationMessages,
  useReactToMessage,
} from "./conversations";

const messagesKey = conversationQueryKeys.messages("conv-1", { perPage: 50 });

const seedMessages = (client: QueryClient) => {
  client.setQueryData(messagesKey, {
    pages: [
      {
        data: [
          {
            id: "msg-1",
            direction: "INBOUND",
            authorType: "USER",
            authorId: "user-1",
            text: "hi",
            dateSent: "2026-01-01T00:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
            reactions: [],
          },
        ],
        page: 1,
        total: 1,
      },
    ],
    pageParams: [1],
  });
};

describe("useConversationMessages", () => {
  // Endpoint serves newest-first pages (page 1 = newest 50, chronological
  // within the page); page 2 (fetched by scrolling up) is the 50 older ones.
  const makePage = (prefix: string) => ({
    data: {
      data: Array.from({ length: 50 }, (_, i) => ({ id: `${prefix}${i}` })),
      _metadata: { pagination: { total: 200 } },
    },
  });

  it("stacks older pages above newer ones so the newest message is at the bottom", async () => {
    listMessages.mockImplementation(async ({ query }: A) =>
      query.page === 1 ? makePage("new") : makePage("old"),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useConversationMessages("conv-1"), {
      wrapper,
    });

    // Initial load: only the newest page, in chronological order.
    await waitFor(() => expect(result.current.messages).toHaveLength(50));
    expect(result.current.messages[0].id).toBe("new0");
    expect(result.current.messages.at(-1)!.id).toBe("new49");

    // Scroll-to-top loads the older page; it must sit ABOVE the newer one.
    result.current.fetchNextPage();
    await waitFor(() => expect(result.current.messages).toHaveLength(100));
    expect(result.current.messages[0].id).toBe("old0");
    expect(result.current.messages[49].id).toBe("old49");
    expect(result.current.messages[50].id).toBe("new0");
    expect(result.current.messages.at(-1)!.id).toBe("new49");
  });
});

describe("useReactToMessage", () => {
  it("optimistically adds an operator reaction to the matching message", async () => {
    reactToMessage.mockResolvedValue({
      data: {
        data: {
          id: "msg-1",
          direction: "INBOUND",
          authorType: "USER",
          authorId: "user-1",
          text: "hi",
          dateSent: "2026-01-01T00:00:00Z",
          createdAt: "2026-01-01T00:00:00Z",
          reactions: [
            {
              emoji: "👍",
              actorType: "operator",
              actorId: "op-1",
              at: "2026-01-01T00:00:01Z",
            },
          ],
        },
      },
    });

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedMessages(client);
    const localWrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useReactToMessage("conv-1", "op-1"), {
      wrapper: localWrapper,
    });

    result.current.mutate({ messageId: "msg-1", emoji: "👍", action: "react" });

    // Optimistic update happens synchronously inside onMutate.
    await waitFor(() => {
      const cached = client.getQueryData<A>(messagesKey);
      expect(cached.pages[0].data[0].reactions).toHaveLength(1);
    });
    const cached = client.getQueryData<A>(messagesKey);
    expect(cached.pages[0].data[0].reactions[0]).toMatchObject({
      emoji: "👍",
      actorType: "operator",
      actorId: "op-1",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reactToMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { workspace: "w", id: "conv-1", messageId: "msg-1" },
        body: { emoji: "👍", action: "react" },
      }),
    );
  });

  it("rolls back the optimistic reaction and toasts on error", async () => {
    reactToMessage.mockRejectedValue(new Error("boom"));

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedMessages(client);
    const localWrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useReactToMessage("conv-1", "op-1"), {
      wrapper: localWrapper,
    });

    result.current.mutate({ messageId: "msg-1", emoji: "🔥", action: "react" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = client.getQueryData<A>(messagesKey);
    expect(cached.pages[0].data[0].reactions).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith(
      "conversations.reactions.toastFailed",
    );
  });
});
