import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ConversationListItem is the row component; it shows a link-icon merge badge
// only when its `hasMergeSuggestion` prop is true. That prop is derived in
// ConversationList from `usePendingMergeCustomerIds().customerIds.has(customerId)`.
//
// We test the *row* directly here (the unit responsible for the badge) — the
// container's wiring (hook -> Set.has -> prop) is straightforward selector
// logic that doesn't merit its own jsdom test.

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: ({ type }: { type: string | null | undefined }) => (
    <span data-testid="platform-icon">{type ?? ""}</span>
  ),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { ConversationListItem } from "./conversation-list-item";

// ConversationListItem reads workspaceSlug via useWorkspaceParams (useParams
// under the hood) — a bare MemoryRouter never populates route params, so the
// row must render behind a matching :workspaceSlug route.
const renderItem = (ui: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={["/acme/conversations"]}>
      <Routes>
        <Route path=":workspaceSlug/*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

const baseConversation = {
  id: "conv-1",
  senderId: "sender-1",
  senderName: "Alice",
  account: { id: "acc-1", name: "Acme FB", type: "FACEBOOK_PAGE" },
  status: "OPEN",
  lastMessageAt: "2026-06-15T00:00:00Z",
  updatedAt: "2026-06-15T00:00:00Z",
  customerId: "cust-1",
  botEnabled: true,
  handoffReason: null,
} as A;

beforeEach(() => {});
afterEach(() => {
  vi.clearAllMocks();
});

describe("ConversationListItem — merge-suggestion badge", () => {
  it("renders the link-icon merge badge when hasMergeSuggestion=true", () => {
    renderItem(
      <ConversationListItem
        conversation={baseConversation}
        basePath="/ws/conversations"
        isActive={false}
        hasNewHandoff={false}
        showChatbot={false}
        hasMergeSuggestion={true}
      />,
    );

    // The badge is rendered as a span carrying the translated aria-label —
    // production wraps the icon in that span. Match by aria-label.
    const badge = screen.getByLabelText(
      "conversations.list.row.mergeSuggestionBadge",
    );
    expect(badge).toBeInTheDocument();
    // It contains an svg (the link icon).
    expect(badge.querySelector("svg")).toBeTruthy();
  });

  it("does NOT render the merge badge when hasMergeSuggestion=false (or omitted)", () => {
    renderItem(
      <ConversationListItem
        conversation={baseConversation}
        basePath="/ws/conversations"
        isActive={false}
        hasNewHandoff={false}
        showChatbot={false}
        hasMergeSuggestion={false}
      />,
    );

    expect(
      screen.queryByLabelText("conversations.list.row.mergeSuggestionBadge"),
    ).not.toBeInTheDocument();
  });

  it("default (no prop) — no badge is rendered", () => {
    renderItem(
      <ConversationListItem
        conversation={baseConversation}
        basePath="/ws/conversations"
        isActive={false}
        hasNewHandoff={false}
        showChatbot={false}
      />,
    );

    expect(
      screen.queryByLabelText("conversations.list.row.mergeSuggestionBadge"),
    ).not.toBeInTheDocument();
  });
});
