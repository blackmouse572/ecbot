import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";

// jsdom doesn't ship ResizeObserver, which Radix Dialog instantiates on mount.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const useKnowledgeItem = vi.fn();

vi.mock("@/hooks/api/knowledge-base", () => ({
  useChatbotKnowledgeItems: () => ({
    isLoading: false,
    items: [
      {
        id: "link-1",
        knowledgeItem: {
          id: "item-1",
          knowledgeBaseId: "kb-1",
          type: "TEXT",
          title: "Return policy",
          status: "COMPLETED",
        },
      },
    ],
  }),
  useUnlinkKnowledgeItemFromChatbot: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useKnowledgeItem: (...args: unknown[]) => useKnowledgeItem(...args),
}));

// The add drawer pulls in routing and workspace hooks this test doesn't need.
vi.mock("./chatbot-rag-section-add-drawer", () => ({
  ChatbotRAGSectionAddDrawer: () => null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

import { ChatbotRAGSection } from "./chatbot-rag-section";

describe("ChatbotRAGSection preview", () => {
  it("opens the lazy preview dialog for the clicked item and closes it", async () => {
    useKnowledgeItem.mockReturnValue({
      isLoading: false,
      item: {
        id: "item-1",
        knowledgeBaseId: "kb-1",
        type: "TEXT",
        title: "Return policy",
        status: "COMPLETED",
        content: "Returns accepted within 30 days",
      },
    });
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ChatbotRAGSection
          item={{ id: "bot-1" } as ChatbotGetDetailResponseDto}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "actions.preview" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Returns accepted within 30 days"),
    ).toBeInTheDocument();
    expect(useKnowledgeItem).toHaveBeenCalledWith("kb-1", "item-1");

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
