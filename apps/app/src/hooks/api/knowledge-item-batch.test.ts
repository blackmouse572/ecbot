import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  tag: vi.fn(),
  link: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@repo/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/client")>()),
  knowledgeItemWorkspaceControllerBatchTagV1: sdk.tag,
  chatbotKnowledgeItemWorkspaceControllerBatchLinkV1: sdk.link,
  knowledgeItemWorkspaceControllerListV1: sdk.list,
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "kunmart" } }),
}));

import {
  useBatchLinkKnowledgeItemsToChatbot,
  useFetchAllKnowledgeItemIds,
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

  // The list endpoint clamps page to 20, so page 21 repeats page 20 forever.
  it("stops select-all at 20 pages and reports the truncation", async () => {
    sdk.list.mockImplementation(async () => ({
      data: {
        data: Array.from({ length: 100 }, (_, i) => ({ id: `id-${i}` })),
      },
    }));
    const { result } = renderHook(() => useFetchAllKnowledgeItemIds("kb-1"), {
      wrapper,
    });

    const { ids, truncated } = await result.current({});

    expect(sdk.list).toHaveBeenCalledTimes(20);
    expect(ids).toHaveLength(2000);
    expect(truncated).toBe(true);
  });
});
