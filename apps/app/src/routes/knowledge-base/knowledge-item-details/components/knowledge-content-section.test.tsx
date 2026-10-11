import "@/i18n";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnowledgeContentSection } from "./knowledge-content-section";

const textItem = {
  id: "item-1",
  knowledgeBaseId: "kb-1",
  type: "TEXT",
  title: "Pet policy",
  content: "Pets under 7 kg are welcome.\nA leash is required.",
  status: "COMPLETED",
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
  deleted: false,
} as KnowledgeItemResponseDto;

describe("KnowledgeContentSection", () => {
  it("shows text content as wrapped prose, keeping line breaks", () => {
    render(<KnowledgeContentSection item={textItem} />);

    const content = screen.getByText(/Pets under 7 kg/);
    expect(content.tagName).not.toBe("PRE");
    expect(content).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(content).not.toHaveClass("font-mono");
  });
});
