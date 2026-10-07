import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const counts = vi.hoisted(() => ({
  chatbots: 0,
  accounts: 0,
  conversations: 0,
}));
const query = (count: number) => ({ count, isLoading: false, isError: false });

vi.mock("@/hooks/api/chatbot", () => ({
  useChatbots: () => query(counts.chatbots),
}));
vi.mock("@/hooks/api/accounts", () => ({
  useAccounts: () => query(counts.accounts),
}));
vi.mock("@/hooks/api/conversations", () => ({
  useConversations: () => query(counts.conversations),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));

import { GettingStarted } from "./getting-started";

const renderCard = () =>
  render(
    <MemoryRouter>
      <GettingStarted />
    </MemoryRouter>,
  );

describe("GettingStarted", () => {
  beforeEach(() => {
    counts.chatbots = 0;
    counts.accounts = 0;
    counts.conversations = 0;
  });

  it("points a brand-new workspace at creating its first agent", () => {
    renderCard();

    expect(screen.getByText("Create your first agent")).toBeInTheDocument();
    expect(screen.getByText("Connect a channel")).toBeInTheDocument();
    expect(screen.getByText("Get your first conversation")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create your first agent/ }),
    ).toHaveAttribute("href", "/kunmart/chatbot/create");
  });

  it("marks finished steps done and links only the rest", () => {
    counts.chatbots = 1;
    renderCard();

    expect(
      screen.queryByRole("link", { name: /Create your first agent/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Connect a channel/ }),
    ).toHaveAttribute("href", "/kunmart/accounts/create");
  });

  it("disappears once every step is done", () => {
    counts.chatbots = 1;
    counts.accounts = 1;
    counts.conversations = 3;
    const { container } = renderCard();

    expect(container).toBeEmptyDOMElement();
  });
});
