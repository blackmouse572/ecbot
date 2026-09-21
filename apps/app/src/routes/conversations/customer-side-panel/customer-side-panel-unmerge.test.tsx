import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Unmerge action lives in the Customer side panel's overflow menu. The
// production gating is: the menu item is always rendered (the service throws
// 404 server-side when there's no merged suggestion to undo). The test asserts
// the click path: open menu -> confirm Prompt -> call useUnmergeCustomer.

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const applyMutate = vi.fn();
const removeMutate = vi.fn();
const updateMutateAsync = vi.fn();
const unmergeMutateAsync = vi.fn();
const promptFn = vi.fn();

vi.mock("@/hooks/api/customers", () => ({
  useCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(() => ({
    mutateAsync: updateMutateAsync,
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

vi.mock("@/hooks/api/customer-merge-suggestions", () => ({
  useUnmergeCustomer: vi.fn(() => ({
    mutateAsync: unmergeMutateAsync,
    isPending: false,
  })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn() },
    usePrompt: () => promptFn,
  };
});

vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: ({ type }: { type: string | null | undefined }) => (
    <span data-testid="platform-icon">{type ?? ""}</span>
  ),
}));

import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import { useUnmergeCustomer } from "@/hooks/api/customer-merge-suggestions";
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
const useUnmergeMock = vi.mocked(useUnmergeCustomer);

const customerFixture = {
  id: "cust-1",
  name: "Alice",
  phone: "",
  email: "",
  language: "",
  notes: "",
  createdAt: "2026-06-15T00:00:00Z",
};

beforeEach(() => {
  applyMutate.mockReset();
  removeMutate.mockReset();
  updateMutateAsync.mockReset();
  unmergeMutateAsync.mockReset().mockResolvedValue({ suggestionId: "sugg-1" });
  promptFn.mockReset();

  useCustomerMock.mockReturnValue({
    customer: customerFixture,
    isLoading: false,
  } as A);
  useContactPointsMock.mockReturnValue({ contactPoints: [] } as A);
  useTagAssignmentsMock.mockReturnValue({ assignments: [] } as A);
  useTagListMock.mockReturnValue({ tags: [], isLoading: false } as A);
  useApplyMock.mockReturnValue({ mutate: applyMutate, isPending: false } as A);
  useRemoveMock.mockReturnValue({
    mutate: removeMutate,
    isPending: false,
  } as A);
  useUnmergeMock.mockReturnValue({
    mutateAsync: unmergeMutateAsync,
    isPending: false,
  } as A);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CustomerSidePanel — Unmerge action", () => {
  it("renders the overflow menu trigger (the ellipsis IconButton)", () => {
    render(<CustomerSidePanel customerId="cust-1" />);

    const moreBtn = screen.getByRole("button", {
      name: "conversations.customer.panel.actions.more",
    });
    expect(moreBtn).toBeInTheDocument();
  });

  it("opening the menu reveals the Unmerge action (always visible — server-side gates with 404)", async () => {
    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    const moreBtn = screen.getByRole("button", {
      name: "conversations.customer.panel.actions.more",
    });
    await user.click(moreBtn);

    const unmergeItem = await screen.findByRole("menuitem", {
      name: "conversations.customer.panel.unmerge.action",
    });
    expect(unmergeItem).toBeInTheDocument();
  });

  it("clicking Unmerge opens a confirm Prompt with the danger variant; confirming calls useUnmergeCustomer", async () => {
    promptFn.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "conversations.customer.panel.actions.more",
      }),
    );

    const unmergeItem = await screen.findByRole("menuitem", {
      name: "conversations.customer.panel.unmerge.action",
    });
    await user.click(unmergeItem);

    expect(promptFn).toHaveBeenCalledTimes(1);
    const promptArgs = promptFn.mock.calls[0][0];
    expect(promptArgs.variant).toBe("danger");

    // promptFn is async; let microtasks flush before asserting on the side effect.
    await Promise.resolve();
    await Promise.resolve();

    expect(unmergeMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("cancelling the prompt does NOT call useUnmergeCustomer", async () => {
    promptFn.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<CustomerSidePanel customerId="cust-1" />);

    await user.click(
      screen.getByRole("button", {
        name: "conversations.customer.panel.actions.more",
      }),
    );
    const unmergeItem = await screen.findByRole("menuitem", {
      name: "conversations.customer.panel.unmerge.action",
    });
    await user.click(unmergeItem);

    await Promise.resolve();
    await Promise.resolve();

    expect(promptFn).toHaveBeenCalledTimes(1);
    expect(unmergeMutateAsync).not.toHaveBeenCalled();
  });

  it("useUnmergeCustomer is bound to the current customerId", () => {
    render(<CustomerSidePanel customerId="cust-1" />);
    // The hook was called with the customerId from the side-panel prop.
    expect(useUnmergeMock).toHaveBeenCalledWith("cust-1");
  });
});
