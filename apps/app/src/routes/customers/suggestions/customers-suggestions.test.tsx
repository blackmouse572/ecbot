import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// useDataTable reads useSearchParams internally, so every render must sit
// under a Router.
const render = (ui: ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

// jsdom doesn't ship ResizeObserver, which Radix Drawer (used by Medusa UI's
// Drawer) instantiates on mount. The merge-suggestion dialog opens a Drawer.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

// jsdom doesn't implement Element.scroll; the DataTable's pagination effect
// calls it on the scroll container after every page change.
if (!HTMLElement.prototype.scroll) {
  HTMLElement.prototype.scroll = () => {};
}

const confirmMutateAsync = vi.fn();
const dismissMutateAsync = vi.fn();

vi.mock("@/hooks/api/customer-merge-suggestions", () => ({
  useCustomerMergeSuggestionList: vi.fn(),
  useConfirmMerge: vi.fn(() => ({
    mutateAsync: confirmMutateAsync,
    isPending: false,
  })),
  useDismissMerge: vi.fn(() => ({
    mutateAsync: dismissMutateAsync,
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
  };
});

import {
  useCustomerMergeSuggestionList,
  type CustomerMergeSuggestionGetResponseDto,
} from "@/hooks/api/customer-merge-suggestions";
import { CustomersSuggestions } from "./customers-suggestions";

const useListMock = vi.mocked(useCustomerMergeSuggestionList);

const baseSuggestion = (
  overrides: Partial<CustomerMergeSuggestionGetResponseDto> = {},
): CustomerMergeSuggestionGetResponseDto => ({
  id: "sugg-1",
  status: "PENDING",
  matchField: "phone",
  matchValue: "0901234567",
  customerA: {
    id: "cust-A",
    name: "Alice",
    phone: "0901234567",
    email: null,
    language: null,
    notes: null,
    profileSummary: null,
    createdAt: "2026-06-15T00:00:00Z",
  },
  customerB: {
    id: "cust-B",
    name: "Bob",
    phone: "0901234567",
    email: null,
    language: null,
    notes: null,
    profileSummary: null,
    createdAt: "2026-06-15T00:00:00Z",
  },
  createdAt: "2026-06-15T00:00:00Z",
  ...overrides,
});

beforeEach(() => {
  confirmMutateAsync.mockReset().mockResolvedValue({
    survivorId: "cust-A",
    loserId: "cust-B",
  });
  dismissMutateAsync.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CustomersSuggestions page", () => {
  it("renders the empty-state copy when no suggestions are returned", () => {
    useListMock.mockReturnValue({
      suggestions: [],
      isLoading: false,
    } as A);

    render(<CustomersSuggestions />);

    expect(screen.getByText("customers.suggestions.empty")).toBeInTheDocument();
  });

  it("renders one table row per PENDING suggestion with both customer names + match field + value", () => {
    useListMock.mockReturnValue({
      suggestions: [
        baseSuggestion(),
        baseSuggestion({
          id: "sugg-2",
          customerA: {
            ...baseSuggestion().customerA,
            id: "cust-C",
            name: "Carol",
          },
          customerB: {
            ...baseSuggestion().customerB,
            id: "cust-D",
            name: "Dave",
          },
          matchField: "email",
          matchValue: "shared@example.com",
        }),
      ],
      totalData: 2,
      isLoading: false,
    } as A);

    render(<CustomersSuggestions />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.getByText("Dave")).toBeInTheDocument();
    // The match field is shown verbatim per the component.
    expect(screen.getByText("phone")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    // The match value is also visible (truncated cell still has the value).
    expect(screen.getByText("0901234567")).toBeInTheDocument();
    expect(screen.getByText("shared@example.com")).toBeInTheDocument();
  });

  it("issues useCustomerMergeSuggestionList with status=PENDING by default and renders the Select trigger showing that status", () => {
    useListMock.mockReturnValue({
      suggestions: [],
      isLoading: false,
    } as A);

    render(<CustomersSuggestions />);

    // The hook is called with the page-level filter args — status drives the
    // backend query. Initial state must be PENDING per the page contract.
    const firstArgs = useListMock.mock.calls[0][0];
    expect(firstArgs?.status).toBe("PENDING");
    expect(firstArgs?.perPage).toBe(50);

    // The Select trigger renders the current status' translation key so an
    // operator can see what they're filtering by — radix Select dropdown is
    // controlled state; the trigger label MUST reflect the state.
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain(
      "customers.suggestions.status.PENDING",
    );
  });

  it("clicking Review on a row opens the merge-suggestion drawer (renders the dialog's title)", async () => {
    useListMock.mockReturnValue({
      suggestions: [baseSuggestion()],
      totalData: 1,
      isLoading: false,
    } as A);

    const user = userEvent.setup();
    render(<CustomersSuggestions />);

    const reviewBtn = screen.getByRole("button", {
      name: "customers.suggestions.actions.review",
    });
    await user.click(reviewBtn);

    // The merge dialog's title comes from a translation key in the drawer.
    const dialogTitle = await screen.findAllByText(
      "customers.suggestions.dialog.title",
    );
    expect(dialogTitle.length).toBeGreaterThan(0);
  });

  it("Review button is disabled for non-PENDING suggestions (DISMISSED/MERGED rows)", () => {
    useListMock.mockReturnValue({
      suggestions: [baseSuggestion({ id: "sugg-d", status: "DISMISSED" })],
      totalData: 1,
      isLoading: false,
    } as A);

    render(<CustomersSuggestions />);

    const reviewBtn = screen.getByRole("button", {
      name: "customers.suggestions.actions.review",
    });
    expect(reviewBtn).toBeDisabled();
  });
});
