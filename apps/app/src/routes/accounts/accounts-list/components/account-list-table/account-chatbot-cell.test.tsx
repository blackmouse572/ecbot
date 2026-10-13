import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AccountChatbotCell } from "./account-chatbot-cell";

const renderCell = (chatbot: { id: string; name: string } | null) =>
  render(
    <MemoryRouter initialEntries={["/acme/accounts"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/accounts"
          element={<AccountChatbotCell chatbot={chatbot} />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("AccountChatbotCell", () => {
  it("links the agent name to its detail page", () => {
    renderCell({ id: "bot-1", name: "Axios Bot" });

    expect(screen.getByRole("link", { name: "Axios Bot" })).toHaveAttribute(
      "href",
      "/acme/chatbot/bot-1",
    );
  });

  it("shows a muted dash when the channel has no agent", () => {
    renderCell(null);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
