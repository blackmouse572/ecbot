import { render, screen } from "@testing-library/react";
import "@/i18n";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The Kênh liên hệ card: one row per channel the customer wrote on, with how
// long the shop may still message them for free, linking to that conversation.

const state = vi.hoisted(() => ({
  conversations: [] as unknown[],
  freeWindows: [] as unknown[],
}));

vi.mock("@/hooks/api/conversations", () => ({
  useConversations: () => ({
    conversations: state.conversations,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/api/customer-marketing", () => ({
  useCustomerMarketing: () => ({
    marketing: { freeWindows: state.freeWindows },
  }),
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

import { ContactPointsList } from "./contact-points-list";

const NOW = new Date("2026-02-13T06:00:00Z").getTime();

const contactPoint = (overrides: object) => ({
  id: crypto.randomUUID(),
  platform: "FACEBOOK_PAGE",
  externalSenderId: "psid-1",
  displaySenderName: "Thanh Tâm",
  ...overrides,
});

const renderList = (contactPoints: unknown[]) =>
  render(
    <MemoryRouter>
      <ContactPointsList customerId="c-1" contactPoints={contactPoints as A} />
    </MemoryRouter>,
  );

describe("ContactPointsList", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    state.conversations = [
      {
        id: "conv-fb",
        senderId: "psid-1",
        lastMessageAt: "2026-02-12T12:00:00Z",
        account: { type: "FACEBOOK_PAGE", name: "Lumi Beauty" },
      },
    ];
    state.freeWindows = [
      {
        channel: "FACEBOOK_PAGE",
        lastInboundAt: "2026-02-12T12:00:00Z",
        openUntil: "2026-02-13T12:00:00Z",
      },
      {
        channel: "ZALO_OA",
        lastInboundAt: "2026-01-01T12:00:00Z",
        openUntil: "2026-01-08T12:00:00Z",
      },
    ];
  });

  it("links each channel to its conversation, with the free window left", () => {
    renderList([contactPoint({})]);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/acme/conversations/conv-fb");
    expect(link).toHaveTextContent("Thanh Tâm");
    expect(link).toHaveTextContent("Facebook · Lumi Beauty");
    expect(screen.getByText("6 hours left")).toBeInTheDocument();
    expect(screen.getByText("Wrote 12/02")).toBeInTheDocument();
  });

  it("says when the free window has closed, and shows a row with no conversation as plain text", () => {
    renderList([
      contactPoint({
        platform: "ZALO_OA",
        externalSenderId: "zalo-1",
        displaySenderName: null,
      }),
    ]);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("zalo-1")).toBeInTheDocument();
    expect(screen.getByText("Free window closed")).toBeInTheDocument();
  });

  it("shows the empty state with no contact points", () => {
    renderList([]);

    expect(screen.getByText("No contact points yet")).toBeInTheDocument();
  });
});
