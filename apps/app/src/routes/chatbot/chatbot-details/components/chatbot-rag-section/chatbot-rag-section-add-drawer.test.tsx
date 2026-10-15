import { TooltipProvider } from "@medusajs/ui";
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

// jsdom has no Element.scroll, which the DataTable body calls on mount.
Element.prototype.scroll = Element.prototype.scroll ?? (() => {});

const kb = vi.hoisted(() => ({
  bases: [] as { id: string }[],
  items: [] as { id: string; title: string; type: string; tags: string[] }[],
  link: vi.fn(),
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

vi.mock(
  "../../../../knowledge-base/knowledge-base-list/components/knowledge-base-list-table/knowledge-item-status-cell",
  () => ({ KnowledgeItemStatusCell: () => null }),
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
      <TooltipProvider>
        <ChatbotRAGSectionAddDrawer
          isOpen
          onClose={() => {}}
          chatbotId="bot-1"
          linkedItemIds={linkedItemIds}
        />
      </TooltipProvider>
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
  });

  it("hides linked items and links every ticked item in one call", async () => {
    renderDrawer(["c"]);

    expect(screen.queryByText("Already")).not.toBeInTheDocument();
    const user = userEvent.setup();
    // [0] is the header select-all; rows follow in order.
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    await user.click(boxes[1]);
    await user.click(screen.getAllByRole("checkbox")[2]);
    await user.click(
      screen.getByRole("button", { name: "knowledgeBase.link.addCount" }),
    );

    expect(kb.link).toHaveBeenCalledWith(["a", "b"]);
  });

  it("links everything matching the filters in one request, without listing ids", async () => {
    renderDrawer(["c"]);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: "knowledgeBase.link.selectAllMatching",
      }),
    );
    // Every row shows as ticked, and the count is the matching total.
    screen.getAllByRole("checkbox").forEach((box) => {
      expect(box).toBeChecked();
    });
    await user.click(
      screen.getByRole("button", { name: "knowledgeBase.link.addCount" }),
    );

    expect(kb.link).toHaveBeenCalledTimes(1);
    expect(kb.link).toHaveBeenCalledWith({
      knowledgeBaseId: "kb-1",
      filter: {
        search: undefined,
        type: undefined,
        status: undefined,
        tags: undefined,
      },
    });
  });

  it("falls back to the ticked rows once a row is unticked", async () => {
    renderDrawer(["c"]);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", {
        name: "knowledgeBase.link.selectAllMatching",
      }),
    );
    await user.click(screen.getAllByRole("checkbox")[2]);
    await user.click(
      screen.getByRole("button", { name: "knowledgeBase.link.addCount" }),
    );

    expect(kb.link).toHaveBeenCalledWith(["a"]);
  });
});
