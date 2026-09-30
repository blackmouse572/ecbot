import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ConversationListItem } from "./conversation-list-item";

const renderRow = (
  handoffReason: string | null,
  chatbot?: { id?: string; name?: string },
) =>
  render(
    <MemoryRouter initialEntries={["/acme/conversations"]}>
      <Routes>
        <Route
          path=":workspaceSlug/*"
          element={
            <ConversationListItem
              conversation={
                {
                  id: "conv-1",
                  senderId: "sender-1",
                  senderName: "Alice",
                  account: {
                    id: "acc-1",
                    name: "Kunmart Bot",
                    type: "TELEGRAM",
                  },
                  status: "OPEN",
                  updatedAt: "2026-06-15T00:00:00Z",
                  botEnabled: false,
                  handoffReason,
                  chatbot,
                } as never
              }
              basePath="/acme/conversations"
              isActive={false}
              hasNewHandoff={false}
              showChatbot={!!chatbot}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ConversationListItem", () => {
  it("shows a readable handoff reason instead of the raw code", () => {
    renderRow("keyword_trigger");
    expect(screen.getByText("Customer asked for staff")).toBeInTheDocument();
    expect(screen.queryByText("keyword_trigger")).not.toBeInTheDocument();
  });

  it("shows a free-text reason as written", () => {
    renderRow("Asked about a refund");
    expect(screen.getByText("Asked about a refund")).toBeInTheDocument();
  });

  it("does not make the channel name a separate link inside the row", () => {
    renderRow(null);
    expect(screen.getByText("Kunmart Bot").closest("a")).toBeNull();
  });

  it("links the chatbot name to its chatbot page", () => {
    renderRow(null, { id: "bot-1", name: "Sales Bot" });
    expect(screen.getByText("Sales Bot").closest("a")).toHaveAttribute(
      "href",
      "/acme/chatbot/bot-1",
    );
  });
});
