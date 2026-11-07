import "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ConversationListItem } from "./conversation-list-item";

const renderRow = (
  handoffReason: string | null,
  chatbot?: { id?: string; name?: string },
  unreadCount = 0,
) =>
  render(
    <TooltipProvider>
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
                    unreadCount,
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
      </MemoryRouter>
    </TooltipProvider>,
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

  it("truncates a long handoff reason so the pill and unread count stay whole", async () => {
    const reason =
      "Khách hỏi về chính sách đổi trả cho đơn hàng đặt tuần trước và muốn gặp nhân viên";

    renderRow(reason, undefined, 3);
    const label = screen.getByText(reason);

    expect(label).toHaveClass("min-w-0", "flex-1", "truncate");
    expect(screen.getByText("3")).toHaveClass("ml-auto", "shrink-0");

    // The full reason stays one hover away.
    await userEvent.hover(label);
    await waitFor(() =>
      expect(screen.getAllByText(reason).length).toBeGreaterThan(1),
    );
  });
});
