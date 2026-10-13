import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const link = vi.hoisted(() => vi.fn());

vi.mock("@repo/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/client")>()),
  chatbotKnowledgeItemWorkspaceControllerLinkV1: link,
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "kunmart" } }),
}));

import { useLinkKnowledgeItemToChatbots } from "./knowledge-base";

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      }),
    },
    children,
  );

// #248 review: each link queues a reindex holding the links at that moment,
// so parallel links could leave an older, shorter snapshot last.
describe("useLinkKnowledgeItemToChatbots", () => {
  it("links one agent at a time and counts the failures", async () => {
    const order: string[] = [];
    let inFlight = 0;
    link.mockImplementation(async ({ path }) => {
      inFlight += 1;
      expect(inFlight).toBe(1);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(path.chatbotId);
      inFlight -= 1;
      if (path.chatbotId === "b") throw new Error("nope");
      return { data: {} };
    });

    const { result } = renderHook(() => useLinkKnowledgeItemToChatbots(), {
      wrapper,
    });
    const outcome = await result.current.mutateAsync({
      knowledgeItemId: "item-1",
      chatbotIds: ["a", "b", "c"],
    });

    expect(order).toEqual(["a", "b", "c"]);
    expect(outcome).toEqual({ failed: 1 });
    expect(link).toHaveBeenCalledWith({
      path: {
        workspace: "kunmart",
        chatbotId: "a",
        knowledgeItemId: "item-1",
        id: "item-1",
      },
    });
  });
});
