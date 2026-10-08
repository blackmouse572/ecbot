import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Data subject rights live in the Customer side panel's overflow menu:
// "Export data" downloads a JSON copy, "Delete customer and all
// conversations" erases them permanently after a danger confirm.

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
const exportMutateAsync = vi.fn();
const eraseMutateAsync = vi.fn();
const downloadJson = vi.fn();

vi.mock("@/hooks/api/customers", () => ({
  useCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(() => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  })),
  useExportCustomer: vi.fn(() => ({
    mutateAsync: exportMutateAsync,
    isPending: false,
  })),
  useEraseCustomer: vi.fn(() => ({
    mutateAsync: eraseMutateAsync,
    isPending: false,
  })),
}));

vi.mock("@/utils", () => ({
  downloadJson: (...args: unknown[]) => downloadJson(...args),
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
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      promise: vi.fn((p: Promise<unknown>) => p),
    },
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
  exportMutateAsync
    .mockReset()
    .mockResolvedValue({ customer: { id: "cust-1" } });
  eraseMutateAsync.mockReset().mockResolvedValue({ conversations: 2 });
  downloadJson.mockReset();

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

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const openMenuItem = async (name: string) => {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", {
      name: "conversations.customer.panel.actions.more",
    }),
  );
  await user.click(await screen.findByRole("menuitem", { name }));
};

describe("CustomerSidePanel: export and erase actions", () => {
  it("Export data downloads the customer JSON", async () => {
    render(<CustomerSidePanel customerId="cust-1" />);

    await openMenuItem("conversations.customer.panel.exportData.action");
    await flush();

    expect(exportMutateAsync).toHaveBeenCalledTimes(1);
    expect(downloadJson).toHaveBeenCalledWith(
      { customer: { id: "cust-1" } },
      "customer-cust-1.json",
    );
  });

  it("Delete asks for a danger confirmation that explains it is permanent", async () => {
    promptFn.mockResolvedValue(true);
    const onErased = vi.fn();
    render(
      <CustomerSidePanel customerId="cust-1" onCustomerErased={onErased} />,
    );

    await openMenuItem("conversations.customer.panel.erase.action");
    await flush();

    const args = promptFn.mock.calls[0][0];
    expect(args.variant).toBe("danger");
    expect(args.description).toBe(
      "conversations.customer.panel.erase.confirm.body",
    );
    expect(eraseMutateAsync).toHaveBeenCalledTimes(1);
    expect(onErased).toHaveBeenCalledTimes(1);
  });

  it("cancelling the confirmation deletes nothing", async () => {
    promptFn.mockResolvedValue(false);
    render(<CustomerSidePanel customerId="cust-1" />);

    await openMenuItem("conversations.customer.panel.erase.action");
    await flush();

    expect(eraseMutateAsync).not.toHaveBeenCalled();
  });
});
