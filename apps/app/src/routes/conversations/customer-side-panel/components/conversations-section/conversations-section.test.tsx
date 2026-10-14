import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useConversations } from "@/hooks/api/conversations";
import { ConversationsSection } from "./conversations-section";

vi.mock("@/hooks/api/conversations", () => ({
  useConversations: vi.fn(),
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: ({ type }: { type?: string }) => (
    <span data-testid="platform-icon">{type}</span>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const withConversations = (state: object) =>
  vi.mocked(useConversations).mockReturnValue({
    conversations: [],
    isPending: false,
    isError: false,
    ...state,
  } as never);

const row = (overrides: object) => ({
  id: "conv-1",
  status: "OPEN",
  botEnabled: true,
  lastMessageAt: "2026-10-14T10:00:00Z",
  chatbot: { id: "bot-1", name: "Shop bot" },
  account: { id: "acc-1", type: "FACEBOOK_PAGE", name: "Shop page" },
  ...overrides,
});

const renderSection = (conversationId = "conv-1") =>
  render(
    <MemoryRouter>
      <ConversationsSection
        customerId="cust-1"
        conversationId={conversationId}
      />
    </MemoryRouter>,
  );

describe("ConversationsSection", () => {
  it("asks for this customer's conversations, newest first", () => {
    withConversations({});
    renderSection();

    expect(useConversations).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cust-1",
        orderBy: "lastMessageAt",
        orderDirection: "DESC",
      }),
    );
  });

  it("links each conversation with its channel and chatbot, and marks the open one", () => {
    withConversations({
      conversations: [
        row({ id: "conv-1" }),
        row({
          id: "conv-2",
          account: { id: "acc-2", type: "ZALO_OA", name: "Shop Zalo" },
          chatbot: { id: "bot-2", name: "Support bot" },
          status: "RESOLVED",
        }),
      ],
    });
    renderSection("conv-1");

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/acme/conversations/conv-1");
    expect(links[1]).toHaveAttribute("href", "/acme/conversations/conv-2");
    expect(screen.getByText("Shop page")).toBeInTheDocument();
    expect(screen.getByText("Support bot")).toBeInTheDocument();
    expect(
      screen.getAllByText("conversations.customer.panel.conversations.current"),
    ).toHaveLength(1);
    expect(
      screen.getByText("conversations.status.resolved"),
    ).toBeInTheDocument();
  });

  it("shows an error when the list fails to load", () => {
    withConversations({ isError: true });
    renderSection();

    expect(screen.getByText("general.loadFailed")).toBeInTheDocument();
  });
});
