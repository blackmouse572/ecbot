import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeItemResponseDto } from "@repo/client";

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
  useKnowledgeItem: (...args: unknown[]) => useKnowledgeItem(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import ChatbotRAGSectionPreviewDialog from "./chatbot-rag-section-preview-dialog";

const baseItem: KnowledgeItemResponseDto = {
  id: "item-1",
  knowledgeBaseId: "kb-1",
  type: "TEXT",
  title: "Return policy",
  status: "COMPLETED",
} as KnowledgeItemResponseDto;

function renderDialog() {
  return render(
    <ChatbotRAGSectionPreviewDialog
      knowledgeBaseId="kb-1"
      itemId="item-1"
      open
      onOpenChange={() => {}}
    />,
  );
}

describe("ChatbotRAGSectionPreviewDialog", () => {
  beforeEach(() => {
    useKnowledgeItem.mockReset();
  });

  it("fetches the item by knowledge base and item id", () => {
    useKnowledgeItem.mockReturnValue({ isLoading: true });
    renderDialog();
    expect(useKnowledgeItem).toHaveBeenCalledWith("kb-1", "item-1");
  });

  it("renders TEXT content", () => {
    useKnowledgeItem.mockReturnValue({
      isLoading: false,
      item: { ...baseItem, content: "Returns accepted within 30 days" },
    });
    renderDialog();
    expect(
      screen.getByText("Returns accepted within 30 days"),
    ).toBeInTheDocument();
    expect(screen.getByText("Return policy")).toBeInTheDocument();
  });

  it("shows the empty state when TEXT has no content", () => {
    useKnowledgeItem.mockReturnValue({
      isLoading: false,
      item: { ...baseItem, content: "" },
    });
    renderDialog();
    expect(
      screen.getByText("knowledge_item.preview_empty"),
    ).toBeInTheDocument();
  });

  it("renders a PDF inline with a download link", () => {
    useKnowledgeItem.mockReturnValue({
      isLoading: false,
      item: {
        ...baseItem,
        type: "FILE",
        title: "test-file",
        attachment: {
          key: "k",
          cdnUrl: "https://signed.example/test.pdf",
          mime: "application/pdf",
          extension: "pdf",
          size: 1024,
        },
      },
    });
    renderDialog();
    expect(screen.getByTitle("test-file")).toHaveAttribute(
      "src",
      "https://signed.example/test.pdf",
    );
    expect(
      screen.getByRole("link", { name: /actions.download/ }),
    ).toHaveAttribute("href", "https://signed.example/test.pdf");
  });

  it("shows an unsupported message for non-PDF files", () => {
    useKnowledgeItem.mockReturnValue({
      isLoading: false,
      item: {
        ...baseItem,
        type: "FILE",
        title: "notes",
        attachment: {
          key: "k",
          cdnUrl: "https://signed.example/notes.docx",
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extension: "docx",
          size: 2048,
        },
      },
    });
    renderDialog();
    expect(
      screen.getByText("knowledge_item.preview_unsupported"),
    ).toBeInTheDocument();
    expect(screen.queryByTitle("notes")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /actions.download/ }),
    ).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", () => {
    useKnowledgeItem.mockReturnValue({ isLoading: false, isError: true });
    renderDialog();
    expect(
      screen.getByText("knowledge_item.preview_error"),
    ).toBeInTheDocument();
  });
});
