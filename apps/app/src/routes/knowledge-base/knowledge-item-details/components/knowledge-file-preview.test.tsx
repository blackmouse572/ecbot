import "@/i18n";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnowledgeFilePreview } from "./knowledge-file-preview";

const fileItem = (
  overrides: Partial<KnowledgeItemResponseDto> = {},
): KnowledgeItemResponseDto =>
  ({
    id: "item-1",
    knowledgeBaseId: "kb-1",
    type: "FILE",
    title: "Return policy",
    status: "COMPLETED",
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
    deleted: false,
    attachment: {
      key: "knowledge-items/ws/kb/1-kunmart-doi-tra.docx",
      cdnUrl: "https://cdn.example/1-kunmart-doi-tra.docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
      size: 2048,
    },
    metadata: { fileName: "kunmart-doi-tra.docx", chunkCount: 3 },
    ...overrides,
  }) as KnowledgeItemResponseDto;

describe("KnowledgeFilePreview", () => {
  it("shows the file and how many sections the assistant learned", () => {
    render(<KnowledgeFilePreview item={fileItem()} />);

    expect(screen.getByText("kunmart-doi-tra.docx")).toBeInTheDocument();
    expect(screen.getByText("DOCX, 2.00 KB")).toBeInTheDocument();
    expect(
      screen.getByText("The assistant learned this file as 3 sections."),
    ).toBeInTheDocument();
    expect(screen.queryByText("File content preview")).not.toBeInTheDocument();
  });

  it("says the file is not learned yet until processing completes", () => {
    render(
      <KnowledgeFilePreview
        item={fileItem({ status: "DRAFT", metadata: { fileName: "a.docx" } })}
      />,
    );

    expect(
      screen.getByText(
        "Not learned yet. The assistant can use this file once processing completes.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a PDF inline", () => {
    render(
      <KnowledgeFilePreview
        item={fileItem({
          attachment: {
            key: "k/faq.pdf",
            cdnUrl: "https://cdn.example/faq.pdf",
            mime: "application/pdf",
            extension: "pdf",
            size: 4096,
          },
        })}
      />,
    );

    expect(screen.getByTitle("Return policy")).toHaveAttribute(
      "src",
      "https://cdn.example/faq.pdf",
    );
  });
});
