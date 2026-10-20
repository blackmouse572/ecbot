import "@/i18n";
import type { KnowledgeItemResponseDto } from "@repo/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnowledgeUrlPreview } from "./knowledge-url-preview";

const urlItem = (
  overrides: Partial<KnowledgeItemResponseDto> = {},
): KnowledgeItemResponseDto =>
  ({
    id: "item-1",
    knowledgeBaseId: "kb-1",
    type: "URL",
    title: "YODY",
    content: "https://yody.vn/",
    status: "COMPLETED",
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    deleted: false,
    metadata: {
      maxPages: 10,
      chunkCount: 12,
      pagesCrawled: 8,
      pageTitle: "YODY - Look Good - Feel Good",
      preview: "# Áo Phao Nữ\n399.200đ",
    },
    ...overrides,
  }) as KnowledgeItemResponseDto;

describe("KnowledgeUrlPreview", () => {
  it("shows the page, what was read and how much", () => {
    render(<KnowledgeUrlPreview item={urlItem()} />);

    expect(screen.getByText("https://yody.vn/")).toBeInTheDocument();
    expect(
      screen.getByText("YODY - Look Good - Feel Good"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The agent read 8 pages and learned them as 12 sections.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Áo Phao Nữ/)).toBeInTheDocument();
  });

  it("says the page is not read yet until processing completes", () => {
    render(
      <KnowledgeUrlPreview
        item={urlItem({ status: "PROCESSING", metadata: { maxPages: 10 } })}
      />,
    );

    expect(
      screen.getByText(
        "Not read yet. The agent can use this website once processing completes.",
      ),
    ).toBeInTheDocument();
  });
});
