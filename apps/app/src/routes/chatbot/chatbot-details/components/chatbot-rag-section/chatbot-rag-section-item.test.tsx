import "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import type { ChatbotKnowledgeItemResponseDto } from "@repo/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  KB_STATUS_CONFIG,
  KB_TYPE_CONFIG,
} from "@/routes/knowledge-base/constants";
import { ChatbotRAGSectionItem } from "./chatbot-rag-section-item";

const renderItem = (status: string) =>
  render(
    <TooltipProvider>
      <ChatbotRAGSectionItem
        item={
          {
            id: "link-1",
            knowledgeItem: {
              id: "item-1",
              type: "TEXT",
              title: "Return policy",
              status,
            },
          } as unknown as ChatbotKnowledgeItemResponseDto
        }
      />
    </TooltipProvider>,
  );

// The card reads like a row of the Knowledge Base list: same type label and
// status badge, so an item looks the same on both pages.
describe("ChatbotRAGSectionItem", () => {
  it("labels the type the way the knowledge list does", () => {
    renderItem("COMPLETED");

    expect(screen.getByText(KB_TYPE_CONFIG.TEXT.label)).toBeInTheDocument();
  });

  it.each(["COMPLETED", "PROCESSING", "FAILED"])(
    "shows the %s status with the knowledge list's label",
    (status) => {
      renderItem(status);

      expect(
        screen.getByText(KB_STATUS_CONFIG[status].label),
      ).toBeInTheDocument();
    },
  );
});
