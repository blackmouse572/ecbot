import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ linked: false }));

vi.mock("@/hooks/api", () => ({
  useAccountChatbot: () => ({
    chatbot: state.linked ? { id: "bot-1" } : undefined,
    isLoading: false,
  }),
}));
vi.mock("@/components/chatbot/chatbot-section", () => ({
  ChatbotSection: ({ chatbotId }: { chatbotId: string }) => (
    <div data-testid="linked-agent">{chatbotId}</div>
  ),
}));

import { AccountChatbotSection } from "./account-chatbot-section";

const renderSection = (type: string) =>
  render(
    <MemoryRouter initialEntries={["/acme/accounts/acc-1"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/accounts/:accountId"
          element={
            <AccountChatbotSection accountId="acc-1" type={type as never} />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("AccountChatbotSection", () => {
  it("offers a quick create that carries the channel into the builder", () => {
    renderSection("FACEBOOK_PAGE");

    expect(screen.getByText("No agent yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create agent" })).toHaveAttribute(
      "href",
      "/acme/chatbot/create?accountId=acc-1",
    );
  });

  it.each(["FACEBOOK_ACCOUNT", "API_CHANNEL"])(
    "renders nothing for %s, a channel the builder cannot connect",
    (type) => {
      renderSection(type);
      expect(screen.queryByText("No agent yet")).not.toBeInTheDocument();
    },
  );
});
