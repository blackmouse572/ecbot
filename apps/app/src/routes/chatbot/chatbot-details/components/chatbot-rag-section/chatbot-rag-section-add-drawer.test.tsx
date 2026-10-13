import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// jsdom doesn't ship ResizeObserver, which Radix Dialog instantiates on mount.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const kb = vi.hoisted(() => ({ bases: [] as { id: string }[] }));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "ws" }),
}));

vi.mock("@/hooks/api/knowledge-base", () => ({
  useKnowledgeBases: () => ({ knowledgeBases: kb.bases }),
  useKnowledgeItems: () => ({ items: [], isLoading: false }),
  useLinkKnowledgeItemToChatbot: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("../../../../knowledge-base/knowledge-item-details/components", () => ({
  KnowledgeMetadataSection: () => null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

import { ChatbotRAGSectionAddDrawer } from "./chatbot-rag-section-add-drawer";

const renderDrawer = () =>
  render(
    <MemoryRouter>
      <ChatbotRAGSectionAddDrawer isOpen onClose={() => {}} chatbotId="bot-1" />
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
