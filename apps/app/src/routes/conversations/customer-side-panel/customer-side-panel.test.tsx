import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock the API hooks at module level so the component never touches network ---

const mutateAsync = vi.fn();

const featureFlags = vi.hoisted(() => ({
  orders: true,
  customerSources: true,
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  useFeatureFlags: () => ({
    flags: featureFlags,
    isLoading: false,
    isError: false,
  }),
}));

// Orders have their own test (components/orders-section).
vi.mock("./components/orders-section", () => ({
  OrdersSection: () => "orders-section",
}));

vi.mock("@/hooks/api/customers", () => ({
  useExportCustomer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useEraseCustomer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(() => ({ mutateAsync, isPending: false })),
}));

// The Tiếp thị block has its own tests.
vi.mock("./components/marketing-section", () => ({
  MarketingSection: () => null,
}));

// Folded sections have their own tests; stubs show when they mount.
vi.mock("./components/conversations-section", () => ({
  ConversationsSection: () => "conversations-section",
}));
vi.mock("./components/timezone-section", () => ({
  TimezoneSection: () => "timezone-section",
}));
vi.mock("./components/followups-section", () => ({
  FollowupsSection: () => "followups-section",
}));

vi.mock("@/hooks/api/contact-points", () => ({
  useContactPointsByCustomer: vi.fn(),
}));

// #175 added tag chips + unmerge action to the panel — stub the hooks so this
// render-focused test stays scoped to the editable-form behavior.
vi.mock("@/hooks/api/customer-tag-assignments", () => ({
  useCustomerTagAssignments: () => ({ assignments: [], isLoading: false }),
  useApplyCustomerTag: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveCustomerTag: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/api/customer-tags", () => ({
  useCustomerTagList: () => ({ tags: [], isLoading: false }),
  useCreateCustomerTag: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/api/customer-merge-suggestions", () => ({
  useUnmergeCustomer: () => ({ mutate: vi.fn(), isPending: false }),
}));

// react-i18next — return the key as the translated string so we can assert on labels.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Medusa UI's toast posts to a portal that needs a root; stub to no-op.
vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");

  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() },
  };
});

// Avoid loading the SVG-by-URL icon component (jsdom doesn't load assets).
vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: ({ type }: { type: string | null | undefined }) => (
    <span data-testid="platform-icon">{type ?? ""}</span>
  ),
}));

import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import { useCustomer, useUpdateCustomer } from "@/hooks/api/customers";
import { CustomerSidePanel } from "./customer-side-panel";

const useCustomerMock = vi.mocked(useCustomer);
const useUpdateCustomerMock = vi.mocked(useUpdateCustomer);
const useContactPointsMock = vi.mocked(useContactPointsByCustomer);

// The hooks return TanStack-Query state shapes; the panel only reads a few
// known fields. Aliasing the real return types lets us stub the subset we
// care about without `any` and without re-implementing every Query/Mutation
// field.
type UseCustomerReturn = ReturnType<typeof useCustomer>;

type UseUpdateCustomerReturn = ReturnType<typeof useUpdateCustomer>;

type UseContactPointsReturn = ReturnType<typeof useContactPointsByCustomer>;

const customerFixture = {
  id: "cust-1",
  name: "Alice Nguyen",
  phone: "+84 909 111 222",
  email: "alice@example.com",
  language: "vi",
  notes: "VIP customer",
  createdAt: "2026-06-15T00:00:00Z",
};

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(customerFixture);
  useUpdateCustomerMock.mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as UseUpdateCustomerReturn);
});

afterEach(() => {
  vi.clearAllMocks();
  featureFlags.orders = true;
});

describe("CustomerSidePanel", () => {
  it("renders nothing when no customerId is provided (no panel for un-linked conversations)", () => {
    useCustomerMock.mockReturnValue({
      customer: undefined,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    const { container } = render(<CustomerSidePanel customerId={null} />);

    expect(container.firstChild).toBeNull();
  });

  it("shows the orders section only while the orders flag is on", async () => {
    useCustomerMock.mockReturnValue({
      customer: customerFixture,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    const { unmount } = render(<CustomerSidePanel customerId="cust-1" />);
    expect(await screen.findByText("orders-section")).toBeInTheDocument();
    unmount();

    featureFlags.orders = false;
    render(<CustomerSidePanel customerId="cust-1" />);
    await screen.findByText("Alice Nguyen");
    expect(screen.queryByText("orders-section")).not.toBeInTheDocument();
  });

  it("shows the customer's details as text, with the form one click away", async () => {
    useCustomerMock.mockReturnValue({
      customer: customerFixture,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    // Read-only by default: no inputs competing with the chat.
    expect(await screen.findByText("Alice Nguyen")).toBeInTheDocument();
    expect(screen.getByText("+84 909 111 222")).toBeInTheDocument();
    expect(screen.getByText("VIP customer")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Alice Nguyen")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "actions.edit" }));
    expect(await screen.findByDisplayValue("Alice Nguyen")).toBeInTheDocument();
  });

  it("marks an empty detail as not set", async () => {
    useCustomerMock.mockReturnValue({
      customer: { ...customerFixture, email: null },
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    render(<CustomerSidePanel customerId="cust-1" />);

    expect(await screen.findByText("general.notSet")).toBeInTheDocument();
  });

  it("folds other conversations and reminders until opened", async () => {
    useCustomerMock.mockReturnValue({
      customer: customerFixture,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" conversationId="conv-1" />);

    expect(screen.queryByText("conversations-section")).not.toBeInTheDocument();
    expect(screen.getByText("timezone-section")).toBeInTheDocument();
    expect(screen.queryByText("followups-section")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "conversations.customer.panel.followups.title",
      }),
    );
    expect(screen.getByText("followups-section")).toBeInTheDocument();
  });

  it("submitting an edited name + email calls useUpdateCustomer's mutateAsync with the new values", async () => {
    useCustomerMock.mockReturnValue({
      customer: customerFixture,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    await user.click(
      await screen.findByRole("button", { name: "actions.edit" }),
    );
    const nameInput = await screen.findByDisplayValue("Alice Nguyen");
    const emailInput = await screen.findByDisplayValue("alice@example.com");

    await user.clear(nameInput);
    await user.type(nameInput, "Bob Tran");
    await user.clear(emailInput);
    await user.type(emailInput, "bob@example.com");

    // Find the Save button by its translation key (mocked t returns the key).
    // #172 review: the panel reuses the shared `actions.save` key now.
    const saveButton = screen.getByRole("button", {
      name: "actions.save",
    });

    await user.click(saveButton);

    // The mutation must be called with a patch object including the new fields.
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const patch = mutateAsync.mock.calls[0][0];
    expect(patch.name).toBe("Bob Tran");
    expect(patch.email).toBe("bob@example.com");
  });

  it("renders one row per contact point with the platform identifier visible", () => {
    useCustomerMock.mockReturnValue({
      customer: customerFixture,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [
        {
          id: "cp-1",
          platform: "FACEBOOK_PAGE",
          externalSenderId: "fb-100",
          displaySenderName: "Alice FB",
          createdAt: "2026-06-15T00:00:00Z",
        },
        {
          id: "cp-2",
          platform: "ZALO_PAGE",
          externalSenderId: "zalo-200",
          displaySenderName: null,
          createdAt: "2026-06-15T00:00:00Z",
        },
      ],
    } as unknown as UseContactPointsReturn);

    render(<CustomerSidePanel customerId="cust-1" />);

    // One PlatformIcon per contact point, each with the platform passed through.
    const icons = screen.getAllByTestId("platform-icon");
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveTextContent("FACEBOOK_PAGE");
    expect(icons[1]).toHaveTextContent("ZALO_PAGE");

    // Display name when present, externalSenderId as fallback.
    expect(screen.getByText("Alice FB")).toBeInTheDocument();
    expect(screen.getByText("zalo-200")).toBeInTheDocument();
  });

  it("renders the empty-state message when the customer has no contact points", () => {
    useCustomerMock.mockReturnValue({
      customer: customerFixture,
      isLoading: false,
    } as unknown as UseCustomerReturn);
    useContactPointsMock.mockReturnValue({
      contactPoints: [],
    } as unknown as UseContactPointsReturn);

    render(<CustomerSidePanel customerId="cust-1" />);

    expect(
      screen.getByText("conversations.customer.panel.contactPoints.empty"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("conversations.customer.panel.contactPoints.emptyHint"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("platform-icon")).not.toBeInTheDocument();
  });
});
