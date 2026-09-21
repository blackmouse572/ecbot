import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock every hook the panel touches at module level — the tag section
// is rendered inside CustomerSidePanel, so we need to satisfy the rest
// of the component too.

const applyMutate = vi.fn();
const removeMutate = vi.fn();
const customerMutateAsync = vi.fn();

vi.mock("@/hooks/api/customers", () => ({
  useCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(() => ({
    mutateAsync: customerMutateAsync,
    isPending: false,
  })),
}));

vi.mock("@/hooks/api/contact-points", () => ({
  useContactPointsByCustomer: vi.fn(),
}));

vi.mock("@/hooks/api/customer-tags", () => ({
  useCustomerTagList: vi.fn(),
}));

vi.mock("@/hooks/api/customer-tag-assignments", () => ({
  useCustomerTagAssignments: vi.fn(),
  useApplyCustomerTag: vi.fn(() => ({ mutate: applyMutate, isPending: false })),
  useRemoveCustomerTag: vi.fn(() => ({
    mutate: removeMutate,
    isPending: false,
  })),
}));

// The panel header renders CustomerActions, which uses useUnmergeCustomer —
// stub it so the real hook (router/query) doesn't run in this render test.
vi.mock("@/hooks/api/customer-merge-suggestions", () => ({
  useUnmergeCustomer: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() },
  };
});

vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: ({ type }: { type: string | null | undefined }) => (
    <span data-testid="platform-icon">{type ?? ""}</span>
  ),
}));

import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import {
  useApplyCustomerTag,
  useCustomerTagAssignments,
  useRemoveCustomerTag,
} from "@/hooks/api/customer-tag-assignments";
import { useCustomerTagList } from "@/hooks/api/customer-tags";
import { useCustomer } from "@/hooks/api/customers";
import { CustomerSidePanel } from "./customer-side-panel";

const useCustomerMock = vi.mocked(useCustomer);
const useContactPointsMock = vi.mocked(useContactPointsByCustomer);
const useTagAssignmentsMock = vi.mocked(useCustomerTagAssignments);
const useTagListMock = vi.mocked(useCustomerTagList);
const useApplyMock = vi.mocked(useApplyCustomerTag);
const useRemoveMock = vi.mocked(useRemoveCustomerTag);

// The hooks return TanStack-Query state shapes; the panel only reads a few
// known fields. Aliasing the real return types lets us stub the subset we
// care about without `any` and without re-implementing every Query/Mutation
// field.
type UseCustomerReturn = ReturnType<typeof useCustomer>;
type UseContactPointsReturn = ReturnType<typeof useContactPointsByCustomer>;
type UseTagAssignmentsReturn = ReturnType<typeof useCustomerTagAssignments>;
type UseTagListReturn = ReturnType<typeof useCustomerTagList>;
type UseApplyReturn = ReturnType<typeof useApplyCustomerTag>;
type UseRemoveReturn = ReturnType<typeof useRemoveCustomerTag>;

const customerFixture = {
  id: "cust-1",
  name: "Alice",
  phone: "",
  email: "",
  language: "",
  notes: "",
  createdAt: "2026-06-15T00:00:00Z",
};

const vipTag = {
  id: "tag-vip",
  name: "VIP",
  emoji: "⭐",
  description: "High value",
  triggersHandoff: false,
};
const hotLeadTag = {
  id: "tag-hot",
  name: "Hot lead",
  emoji: "🔥",
  description: "Strong intent",
  triggersHandoff: false,
};
const angryTag = {
  id: "tag-angry",
  name: "Angry",
  emoji: "🚨",
  description: "upset",
  triggersHandoff: true,
};

beforeEach(() => {
  applyMutate.mockReset();
  removeMutate.mockReset();
  customerMutateAsync.mockReset();
  customerMutateAsync.mockResolvedValue(customerFixture);

  useCustomerMock.mockReturnValue({
    customer: customerFixture,
    isLoading: false,
  } as unknown as UseCustomerReturn);
  useContactPointsMock.mockReturnValue({
    contactPoints: [],
  } as unknown as UseContactPointsReturn);
  useApplyMock.mockReturnValue({
    mutate: applyMutate,
    isPending: false,
  } as unknown as UseApplyReturn);
  useRemoveMock.mockReturnValue({
    mutate: removeMutate,
    isPending: false,
  } as unknown as UseRemoveReturn);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CustomerSidePanel — tags section", () => {
  it("renders applied tag chips with emoji + name when assignments are present", () => {
    useTagAssignmentsMock.mockReturnValue({
      assignments: [
        { id: "assn-1", tag: vipTag, createdAt: "2026-06-15T00:00:00Z" },
        { id: "assn-2", tag: hotLeadTag, createdAt: "2026-06-15T00:00:00Z" },
      ],
    } as unknown as UseTagAssignmentsReturn);
    useTagListMock.mockReturnValue({
      tags: [vipTag, hotLeadTag, angryTag],
      isLoading: false,
    } as unknown as UseTagListReturn);

    render(<CustomerSidePanel customerId="cust-1" />);

    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Hot lead")).toBeInTheDocument();
    // Emojis render as siblings — both should be visible
    expect(screen.getAllByText("⭐").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🔥").length).toBeGreaterThan(0);
  });

  it("renders the empty-state copy when no tags are applied", () => {
    useTagAssignmentsMock.mockReturnValue({
      assignments: [],
    } as unknown as UseTagAssignmentsReturn);
    useTagListMock.mockReturnValue({
      tags: [vipTag],
      isLoading: false,
    } as unknown as UseTagListReturn);

    render(<CustomerSidePanel customerId="cust-1" />);

    expect(
      screen.getByText("conversations.customer.panel.tags.empty"),
    ).toBeInTheDocument();
  });

  it("clicking the × on a chip calls useRemoveCustomerTag with the right tagId", async () => {
    useTagAssignmentsMock.mockReturnValue({
      assignments: [
        { id: "assn-1", tag: vipTag, createdAt: "2026-06-15T00:00:00Z" },
      ],
    } as unknown as UseTagAssignmentsReturn);
    useTagListMock.mockReturnValue({
      tags: [vipTag],
      isLoading: false,
    } as unknown as UseTagListReturn);

    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    const removeButton = screen.getByRole("button", {
      name: "conversations.customer.panel.tags.remove",
    });
    await user.click(removeButton);

    expect(removeMutate).toHaveBeenCalledTimes(1);
    expect(removeMutate).toHaveBeenCalledWith("tag-vip");
  });

  it("Add-tag dropdown lists ONLY catalog tags that are not already applied", async () => {
    useTagAssignmentsMock.mockReturnValue({
      assignments: [
        { id: "assn-1", tag: vipTag, createdAt: "2026-06-15T00:00:00Z" },
      ],
    } as unknown as UseTagAssignmentsReturn);
    useTagListMock.mockReturnValue({
      tags: [vipTag, hotLeadTag, angryTag],
      isLoading: false,
    } as unknown as UseTagListReturn);

    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    const addButton = screen.getByRole("button", {
      name: "conversations.customer.panel.tags.add",
    });
    await user.click(addButton);

    // Only Hot lead and Angry should be selectable (VIP already applied).
    // The dropdown items render in a portal — query by role within the document.
    const menuItems = await screen.findAllByRole("menuitem");
    const labels = menuItems.map((mi) => mi.textContent);
    expect(labels.some((l) => l?.includes("Hot lead"))).toBe(true);
    expect(labels.some((l) => l?.includes("Angry"))).toBe(true);
    expect(labels.some((l) => l?.includes("VIP"))).toBe(false);
  });

  it("selecting a tag from the dropdown calls useApplyCustomerTag with that tagId", async () => {
    useTagAssignmentsMock.mockReturnValue({
      assignments: [],
    } as unknown as UseTagAssignmentsReturn);
    useTagListMock.mockReturnValue({
      tags: [hotLeadTag],
      isLoading: false,
    } as unknown as UseTagListReturn);

    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    const addButton = screen.getByRole("button", {
      name: "conversations.customer.panel.tags.add",
    });
    await user.click(addButton);

    const menuItem = await screen.findByRole("menuitem", {
      name: /Hot lead/,
    });
    await user.click(menuItem);

    expect(applyMutate).toHaveBeenCalledTimes(1);
    expect(applyMutate).toHaveBeenCalledWith("tag-hot");
  });
});
