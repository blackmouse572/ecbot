import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  tag: vi.fn(),
  link: vi.fn(),
}));

vi.mock("@repo/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/client")>()),
  knowledgeItemWorkspaceControllerBatchTagV1: sdk.tag,
  chatbotKnowledgeItemWorkspaceControllerBatchLinkV1: sdk.link,
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "kunmart" } }),
}));

import {
  useBatchLinkKnowledgeItemsToChatbot,
  useBatchTagKnowledgeItems,
} from "./knowledge-base";

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

// The API takes 100 ids per request; "select all matching" can pick more.
const ids = Array.from({ length: 230 }, (_, i) => `id-${i}`);
const ok = (chunk: string[]) => ({
  data: { data: { succeeded: chunk, failed: [] } },
});

describe("batch knowledge item hooks", () => {
  it("tags in chunks of 100 and merges the results", async () => {
    sdk.tag.mockImplementation(async ({ body }) => ok(body.ids));
    const { result } = renderHook(() => useBatchTagKnowledgeItems("kb-1"), {
      wrapper,
    });

    result.current.mutate({ ids, tags: ["menu"] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(sdk.tag.mock.calls.map(([arg]) => arg.body.ids.length)).toEqual([
      100, 100, 30,
    ]);
    expect(sdk.tag.mock.calls[0][0].body.tags).toEqual(["menu"]);
    expect(result.current.data?.succeeded).toHaveLength(230);
  });

  it("links in chunks of 100 for one agent", async () => {
    sdk.link.mockImplementation(async ({ body }) => ok(body.ids));
    const { result } = renderHook(
      () => useBatchLinkKnowledgeItemsToChatbot("bot-1"),
      { wrapper },
    );

    result.current.mutate(ids);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(sdk.link).toHaveBeenCalledTimes(3);
    expect(sdk.link.mock.calls[0][0].path.chatbotId).toBe("bot-1");
  });

  it("sends a filter as is, in a single request", async () => {
    sdk.link.mockReset().mockResolvedValue({
      data: { data: { succeeded: ids, failed: [], truncated: false } },
    });
    const { result } = renderHook(
      () => useBatchLinkKnowledgeItemsToChatbot("bot-1"),
      { wrapper },
    );
    const target = { knowledgeBaseId: "kb-1", filter: { tags: ["menu"] } };

    result.current.mutate(target);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(sdk.link).toHaveBeenCalledTimes(1);
    expect(sdk.link.mock.calls[0][0].body).toEqual(target);
    expect(result.current.data?.succeeded).toHaveLength(230);
  });
});
