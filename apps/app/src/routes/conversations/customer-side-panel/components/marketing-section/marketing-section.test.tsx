import { TooltipProvider } from "@medusajs/ui";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The Tiếp thị block in the conversation's customer panel: each label with
// the reason it holds, the free-message window, and the latest changes.

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const state = vi.hoisted(() => ({
  marketing: undefined as unknown,
  events: [] as unknown[],
}));

vi.mock("@/hooks/api/customer-marketing", () => ({
  useCustomerMarketing: () => ({
    marketing: state.marketing,
    isPending: false,
    isError: false,
  }),
  useCustomerMarketingEvents: () => ({
    events: state.events,
    total: state.events.length,
    isPending: false,
    isError: false,
    hasNextPage: false,
  }),
  useUpdateCustomerMarketing: () => ({ mutateAsync: vi.fn() }),
}));

import { MarketingSection } from "./marketing-section";

const event = (overrides: Record<string, unknown>) => ({
  id: crypto.randomUUID(),
  createdAt: "2026-02-12T12:50:00Z",
  updatedAt: "2026-02-12T12:50:00Z",
  deleted: false,
  actor: "BOT",
  oldValue: null,
  newValue: null,
  reason: null,
  conversationId: null,
  messageId: null,
  ...overrides,
});

const NOW = new Date("2026-02-13T06:00:00Z").getTime();

const renderSection = (onViewMessage = vi.fn()) => {
  render(
    <MemoryRouter initialEntries={["/lumi"]}>
      <Routes>
        <Route
          path="/:workspaceSlug"
          element={
            <TooltipProvider>
              <MarketingSection
                customerId="c-1"
                customerName="Võ Thanh Tâm"
                conversationId="conv-1"
                onViewMessage={onViewMessage}
              />
            </TooltipProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

  return onViewMessage;
};

describe("MarketingSection", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    state.marketing = {
      stage: "ASKED_PRICE",
      permission: "STOPPED",
      permissionUntil: null,
      hostile: false,
      dormant: false,
      stageEvent: event({
        kind: "STAGE",
        actor: "CLASSIFIER",
        oldValue: "INTERESTED",
        newValue: "ASKED_PRICE",
        reason: "Asked the price of the vitamin C serum",
      }),
      permissionEvent: event({
        kind: "PERMISSION",
        actor: "RULE",
        oldValue: "GRANTED",
        newValue: "STOPPED",
        reason: "opt_out_keyword",
      }),
      hostileEvent: null,
      freeWindows: [
        {
          channel: "FACEBOOK_PAGE",
          lastInboundAt: "2026-02-12T12:00:00Z",
          openUntil: "2026-02-13T12:00:00Z",
        },
      ],
      reactions: [],
      firstSource: null,
    };
    state.events = [];
  });

  it("shows each label with the reason it holds", () => {
    renderSection();

    expect(screen.getByText("Asked price")).toBeInTheDocument();
    expect(
      screen.getByText("Asked the price of the vitamin C serum"),
    ).toBeInTheDocument();
    expect(screen.getByText(/· Classifier$/)).toBeInTheDocument();
    // Stopped is loud; the rule's reason code reads as words.
    expect(screen.getByText("Stopped for good")).toBeInTheDocument();
    expect(screen.getByText('Customer sent "stop"')).toBeInTheDocument();
  });

  it("shows Inactive instead of the stage, and the pause end date", () => {
    state.marketing = {
      ...(state.marketing as object),
      dormant: true,
      permission: "PAUSED",
      permissionUntil: "2026-04-15T16:59:59Z",
      permissionEvent: null,
    };
    renderSection();

    expect(screen.getByText("Inactive")).toHaveAttribute(
      "title",
      "Asked price",
    );
    expect(screen.getByText(/Paused until Apr 15, 2026/)).toBeInTheDocument();
  });

  it("says how long free messages stay open on each channel", () => {
    renderSection();

    expect(screen.getByText("6 hours left on Facebook")).toBeInTheDocument();
    expect(
      screen.getByText("Customer last wrote 18 hours ago"),
    ).toBeInTheDocument();
  });

  it("lists the five latest changes and jumps to this conversation's messages", async () => {
    vi.useRealTimers();
    state.events = [
      event({
        kind: "PERMISSION",
        oldValue: "PENDING",
        newValue: "GRANTED",
        conversationId: "conv-1",
        messageId: "msg-1",
      }),
      event({
        kind: "STAGE",
        oldValue: null,
        newValue: "NEW",
        reason: "first_message",
        conversationId: "conv-other",
        messageId: "msg-2",
      }),
      ...Array.from({ length: 4 }, () =>
        event({ kind: "CONSENT_ASKED", newValue: "PENDING" }),
      ),
    ];
    const onViewMessage = renderSection();

    const list = screen
      .getByText("Offers: Not agreed yet to Agreed")
      .closest("ul") as HTMLElement;

    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getByText("Stage: New")).toBeInTheDocument();

    // Only a message of the conversation on screen can be jumped to.
    const links = within(list).getAllByRole("button", {
      name: "View message",
    });

    expect(links).toHaveLength(1);
    await userEvent.click(links[0]!);
    expect(onViewMessage).toHaveBeenCalledWith("msg-1");
    expect(screen.getByRole("button", { name: "View all" })).toBeVisible();
  });

  it("words product group and source events too", () => {
    state.events = [
      event({ kind: "REACTION", oldValue: null, newValue: "2026-04-15" }),
      event({ kind: "REACTION", oldValue: "2026-04-15", newValue: null }),
      event({ kind: "INTENT", newValue: "ASKED_PRICE" }),
      event({ kind: "SOURCE", actor: "RULE" }),
    ];
    renderSection();

    expect(
      screen.getByText("Paused a product group until 4/15"),
    ).toBeInTheDocument();
    expect(screen.getByText("Product group pause ended")).toBeInTheDocument();
    expect(
      screen.getByText("Product group interest: Asked price"),
    ).toBeInTheDocument();
    expect(screen.getByText("Came through a source link")).toBeInTheDocument();
  });

  it("shows each paused product group with the customer's words", () => {
    state.marketing = {
      ...(state.marketing as object),
      reactions: [
        {
          productGroupId: "g-1",
          productGroupName: "Serum",
          until: "2026-04-15T16:59:59Z",
          reason: "để sau nha, giờ chưa cần",
        },
      ],
    };
    renderSection();

    expect(screen.getByText("Product groups")).toBeInTheDocument();
    expect(screen.getByText("Serum paused until 4/15")).toBeInTheDocument();
    expect(screen.getByText("để sau nha, giờ chưa cần")).toBeInTheDocument();
    expect(
      screen.getByText("Offers for other product groups can still go out."),
    ).toBeInTheDocument();
  });

  it("hides the product group row when nothing is paused", () => {
    renderSection();

    expect(screen.queryByText("Product groups")).not.toBeInTheDocument();
  });

  it("links the first source and names the code the customer came through", () => {
    state.marketing = {
      ...(state.marketing as object),
      firstSource: {
        sourceId: "src-1",
        sourceName: "Tờ rơi trong hộp quà Tết",
        codeName: "KOL Minh Thư",
        channel: "FACEBOOK_PAGE",
        at: "2026-02-12T12:42:00Z",
      },
    };
    renderSection();

    expect(
      screen.getByRole("link", { name: "Tờ rơi trong hộp quà Tết" }),
    ).toHaveAttribute("href", "/lumi/sources/src-1");
    expect(screen.getByText(/^Through KOL Minh Thư, /)).toBeInTheDocument();
  });

  it("says the customer wrote in directly when there is no source", () => {
    renderSection();

    expect(screen.getByText("First source")).toBeInTheDocument();
    expect(screen.getByText("Messaged the page directly")).toBeInTheDocument();
  });
});
