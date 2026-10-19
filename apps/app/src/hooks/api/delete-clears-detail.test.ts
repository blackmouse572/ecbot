import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const ok = vi.hoisted(() =>
  vi.fn(async (options: { body?: { ids: string[] } }) => ({
    data: { data: { succeeded: options.body?.ids ?? [], failed: [] } },
  })),
);

vi.mock("@repo/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/client")>()),
  skillWorkspaceControllerDeleteV1: ok,
  skillWorkspaceControllerBatchDeleteV1: ok,
  toolWorkspaceControllerDeleteV1: ok,
  toolWorkspaceControllerBatchDeleteV1: ok,
  knowledgeItemWorkspaceControllerDeleteV1: ok,
  knowledgeItemWorkspaceControllerBatchDeleteV1: ok,
  chatbotControllerBatchDeleteV1: ok,
  accountControllerDeleteSyncV1: ok,
  accountControllerBatchDeleteSyncV1: ok,
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "kunmart" } }),
}));

vi.mock("../use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));

import {
  accountQueryKeys,
  useBatchUnlinkAccounts,
  useUnLinkAccount,
} from "./accounts";
import { chatbotQueryKeys, useBatchDeleteChatbots } from "./chatbot";
import {
  knowledgeBaseQueryKeys,
  useBatchDeleteKnowledgeItems,
  useDeleteKnowledgeItem,
} from "./knowledge-base";
import {
  skillsQueryKeys,
  useBatchDeleteSkills,
  useDeleteSkill,
} from "./skills";
import { toolsQueryKeys, useBatchDeleteTools, useDeleteTool } from "./tools";

// A detail page reads its cached data first, so a deleted item kept opening
// from Back or an old link until the cache aged out.
const cases: [
  string,
  () => { mutateAsync: (v: A) => Promise<unknown> },
  A,
  readonly unknown[][],
][] = [
  [
    "skill",
    () => ({ mutateAsync: useDeleteSkill("kunmart").deleteSkill }),
    "a",
    [skillsQueryKeys.detail("a")],
  ],
  [
    "skills",
    () => ({ mutateAsync: useBatchDeleteSkills("kunmart").batchDeleteSkills }),
    ["a", "b"],
    [skillsQueryKeys.detail("a"), skillsQueryKeys.detail("b")],
  ],
  [
    "tool",
    () => ({ mutateAsync: useDeleteTool("kunmart").deleteTool }),
    "a",
    [toolsQueryKeys.detail("a")],
  ],
  [
    "tools",
    () => ({ mutateAsync: useBatchDeleteTools("kunmart").batchDeleteTools }),
    ["a", "b"],
    [toolsQueryKeys.detail("a"), toolsQueryKeys.detail("b")],
  ],
  [
    "knowledge item",
    () => useDeleteKnowledgeItem("kb-1"),
    "a",
    [knowledgeBaseQueryKeys.itemDetail("a")],
  ],
  [
    "knowledge items",
    () => useBatchDeleteKnowledgeItems("kb-1"),
    ["a", "b"],
    [
      knowledgeBaseQueryKeys.itemDetail("a"),
      knowledgeBaseQueryKeys.itemDetail("b"),
    ],
  ],
  [
    "chatbots",
    () => useBatchDeleteChatbots(),
    ["a", "b"],
    [chatbotQueryKeys.detail("a"), chatbotQueryKeys.detail("b")],
  ],
  ["channel", () => useUnLinkAccount(), "a", [accountQueryKeys.detail("a")]],
  [
    "channels",
    () => useBatchUnlinkAccounts(),
    ["a", "b"],
    [accountQueryKeys.detail("a"), accountQueryKeys.detail("b")],
  ],
];

describe("deleting clears the cached detail", () => {
  it.each(cases)("%s", async (_name, useHook, variables, keys) => {
    const queryClient = new QueryClient();
    for (const key of keys) queryClient.setQueryData(key, { id: "cached" });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(useHook, { wrapper });

    await result.current.mutateAsync(variables);

    await waitFor(() => {
      for (const key of keys) {
        expect(queryClient.getQueryData(key)).toBeUndefined();
      }
    });
  });
});
