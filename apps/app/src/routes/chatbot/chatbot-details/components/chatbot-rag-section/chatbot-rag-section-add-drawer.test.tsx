import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom doesn't ship ResizeObserver, which Radix Dialog instantiates on mount.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const kb = vi.hoisted(() => ({
  bases: [] as { id: string }[],
  items: [] as { id: string; title: string; type: string; tags: string[] }[],
  link: vi.fn(),
  fetchAllIds: vi.fn(),
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "ws" }),
}));

vi.mock("@/hooks/api/knowledge-base", () => ({
  useKnowledgeBases: () => ({ knowledgeBases: kb.bases }),
  useKnowledgeItems: () => ({
    items: kb.items,
    count: kb.items.length,
    isLoading: false,
  }),
  useFetchAllKnowledgeItemIds: () => kb.fetchAllIds,
  useBatchLinkKnowledgeItemsToChatbot: () => ({
    mutateAsync: kb.link,
    isPending: false,
  }),
}));

// The real cell wraps its icon in a Tooltip that needs an app-level provider.
vi.mock(
  "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-title-cell",
  () => ({
    KnowledgeItemTitleCell: ({ title }: { title: string }) => <>{title}</>,
  }),
);

vi.mock("@/hooks/api/knowledge-tag", () => ({
  useKnowledgeTags: () => ({ tags: ["menu"] }),
}));

vi.mock("@/hooks/use-batch-result-toast", () => ({
  useBatchResultToast: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

import { ChatbotRAGSectionAddDrawer } from "./chatbot-rag-section-add-drawer";

const renderDrawer = (linkedItemIds: string[] = []) =>
  render(
    <MemoryRouter>
      <ChatbotRAGSectionAddDrawer
        isOpen
        onClose={() => {}}
        chatbotId="bot-1"
        linkedItemIds={linkedItemIds}
      />
    </MemoryRouter>,
  );

describe("ChatbotRAGSectionAddDrawer create button", () => {
  // #283: Create starts the agent-aware flow, not a bare item create.
  it("links to item create carrying this agent", () => {
    kb.bases = [{ id: "kb-1" }];
    renderDrawer();

    expect(
      screen.getByRole("link", { name: "actions.createNew" }),
    ).toHaveAttribute(
      "href",
      "/ws/knowledge-base/kb-1/item/create?agent=bot-1",
    );
  });

  it("hides Create and still renders when the workspace has no knowledge base", () => {
    kb.bases = [];
    renderDrawer();

    expect(
      screen.queryByRole("link", { name: "actions.createNew" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "actions.add" }),
    ).toBeInTheDocument();
  });
});

describe("ChatbotRAGSectionAddDrawer multi-select", () => {
  beforeEach(() => {
    kb.bases = [{ id: "kb-1" }];
    kb.items = [
      { id: "a", title: "Menu", type: "TEXT", tags: ["menu"] },
      { id: "b", title: "Hours", type: "TEXT", tags: [] },
      { id: "c", title: "Already", type: "TEXT", tags: [] },
    ];
    kb.link
      .mockReset()
      .mockResolvedValue({ succeeded: ["a", "b"], failed: [] });
    kb.fetchAllIds.mockReset().mockResolvedValue(["a", "b", "c", "z"]);
  });

  it("hides linked items and links every ticked item in one call", async () => {
    renderDrawer(["c"]);

    expect(screen.queryByText("Already")).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /Menu/ }));
    await user.click(screen.getByRole("checkbox", { name: /Hours/ }));
    await user.click(
      screen.getByRole("button", { name: "knowledgeBase.link.addCount" }),
    );

    expect(kb.link).toHaveBeenCalledWith(["a", "b"]);
  });

  it("selects all matching across pages but never an already linked item", async () => {
    renderDrawer(["c"]);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: "knowledgeBase.link.selectAllMatching",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "knowledgeBase.link.addCount" }),
    );

    expect(kb.link).toHaveBeenCalledWith(["a", "b", "z"]);
  });
});
