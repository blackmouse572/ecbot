import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The customer page: a header with the next steps and tabs, the overview
// cards on the left, and the conversation panel's blocks on the right.

const state = vi.hoisted(() => ({
  customer: {} as Record<string, unknown>,
  denied: [] as string[],
}));

vi.mock("@repo/auth", () => ({
  Can: ({ children }: { children: unknown }) => children,
  useAbility: () => ({
    can: (_action: string, subject: string) => !state.denied.includes(subject),
  }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  useFeatureFlags: () => ({ flags: { orders: true, customerSources: true } }),
}));
vi.mock("@/hooks/api/customers", () => ({
  useCustomer: () => ({ customer: state.customer, isLoading: false }),
}));
vi.mock("@/hooks/api/contact-points", () => ({
  useContactPointsByCustomer: () => ({
    contactPoints: [{ id: "cp-1", platform: "FACEBOOK_PAGE" }],
  }),
}));
vi.mock("@/hooks/api/conversations", () => ({
  useConversations: () => ({
    conversations: [{ id: "conv-new" }, { id: "conv-old" }],
  }),
}));
vi.mock("@/hooks/api/orders", () => ({
  useOrders: () => ({ orders: [], count: 2 }),
}));
vi.mock("@/hooks/api/customer-marketing", () => ({
  useCustomerMarketing: () => ({
    marketing: {
      stage: "ASKED_PRICE",
      dormant: false,
      firstSource: {
        sourceId: "src-1",
        sourceName: "Tờ rơi Tết",
        at: "2026-11-02T00:00:00Z",
      },
    },
  }),
}));
vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: () => null,
}));

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => () => <div>{name}</div>,
}));
vi.mock("./components/customer-stats", () => ({
  CustomerStats: stub("stats"),
}));
vi.mock("./components/customer-upcoming", () => ({
  CustomerUpcoming: stub("upcoming"),
}));
vi.mock("./components/customer-activity", () => ({
  CustomerActivity: ({ only }: { only?: string }) => (
    <div>{only ? `activity:${only}` : "activity"}</div>
  ),
}));
vi.mock(
  "@/routes/conversations/customer-side-panel/components/conversations-section",
  () => ({
    ConversationsSection: stub("conversations list"),
  }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/orders-section",
  () => ({ OrdersSection: stub("orders") }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/marketing-section",
  () => ({
    MarketingSection: stub("marketing"),
  }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/tags-section",
  () => ({ TagsSection: stub("tags") }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/contact-points-list",
  () => ({
    ContactPointsList: stub("contact points"),
  }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/saved-fields-section",
  () => ({
    SavedFieldsSection: () => null,
  }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/customer-actions",
  () => ({
    CustomerActions: stub("more actions"),
  }),
);
vi.mock(
  "@/routes/conversations/customer-side-panel/components/customer-edit-drawer",
  () => ({
    CustomerEditDrawer: ({ open }: { open: boolean }) =>
      open ? <div>edit drawer</div> : null,
  }),
);

import { CustomerDetail } from "./customer-detail";

const renderPage = (url = "/lumi/customers/c-1") =>
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/:workspaceSlug/customers/:customerId"
            element={<CustomerDetail />}
          />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );

describe("CustomerDetail", () => {
  beforeEach(() => {
    state.denied = [];
    state.customer = {
      id: "c-1",
      name: "Võ Thanh Tâm",
      phone: "0908 412 118",
      createdAt: "2026-11-02T00:00:00Z",
      profileSummary: "Da dầu, đang hỏi giá kem chống nắng.",
      mergedIntoCustomerId: null,
    };
  });

  it("heads the page with the stage, where they came from and the next steps", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Võ Thanh Tâm" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Asked price")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tờ rơi Tết" })).toHaveAttribute(
      "href",
      "/lumi/sources/src-1",
    );
    expect(screen.getByRole("link", { name: /^Chat$/ })).toHaveAttribute(
      "href",
      "/lumi/conversations/conv-new",
    );
    expect(screen.getByRole("link", { name: /Add order/ })).toHaveAttribute(
      "href",
      "/lumi/orders/create?customer=c-1",
    );
  });

  it("leaves out Chat for someone who cannot read conversations", () => {
    state.denied = ["CONVERSATION"];
    renderPage();

    expect(
      screen.queryByRole("link", { name: /^Chat$/ }),
    ).not.toBeInTheDocument();
  });

  it("opens on the overview and switches tabs, with counts", async () => {
    renderPage();

    expect(screen.getByText("stats")).toBeInTheDocument();
    expect(screen.getByText("activity")).toBeInTheDocument();

    const conversationsTab = screen.getByRole("tab", { name: /Conversations/ });
    expect(conversationsTab).toHaveTextContent("Conversations2");
    expect(screen.getByRole("tab", { name: /Orders/ })).toHaveTextContent(
      "Orders2",
    );
    await userEvent.click(conversationsTab);
    expect(screen.getByText("conversations list")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Marketing" }));
    expect(screen.getByText("activity:marketing")).toBeInTheDocument();
  });

  it("opens the overview when ?tab=orders names a tab they cannot see", () => {
    state.denied = ["ORDER"];
    renderPage("/lumi/customers/c-1?tab=orders");

    expect(
      screen.queryByRole("tab", { name: /Orders/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("stats")).toBeInTheDocument();
  });

  it("shows who they are as text, with the form one click away", async () => {
    renderPage();

    expect(
      screen.getByText("Da dầu, đang hỏi giá kem chống nắng."),
    ).toBeInTheDocument();
    expect(screen.getByText("0908 412 118")).toBeInTheDocument();
    expect(screen.queryByText("edit drawer")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("edit drawer")).toBeInTheDocument();
  });

  it("sends a merged profile on to the customer it was merged into", () => {
    state.customer = { ...state.customer, mergedIntoCustomerId: "c-2" };
    render(
      <MemoryRouter initialEntries={["/lumi/customers/c-1"]}>
        <Routes>
          <Route
            path="/:workspaceSlug/customers/:customerId"
            element={<CustomerDetail />}
          />
          <Route path="/lumi/customers/c-2" element={<div>merged into</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("merged into")).toBeInTheDocument();
  });
});
