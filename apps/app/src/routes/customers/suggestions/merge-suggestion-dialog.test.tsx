import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom doesn't ship ResizeObserver, which Radix Drawer instantiates on mount.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const confirmMutateAsync = vi.fn();
const dismissMutateAsync = vi.fn();

vi.mock("@/hooks/api/customer-merge-suggestions", () => ({
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

import type { CustomerMergeSuggestionGetResponseDto } from "@/hooks/api/customer-merge-suggestions";
import { MergeSuggestionDialog } from "./merge-suggestion-dialog";

const suggestionFixture: CustomerMergeSuggestionGetResponseDto = {
  id: "sugg-1",
  status: "PENDING",
  matchField: "phone",
  matchValue: "0901234567",
  customerA: {
    id: "cust-A",
    name: "Alice A",
    phone: "0901234567",
    email: "alice@a.com",
    language: "vi",
    notes: null,
    profileSummary: null,
    createdAt: "2026-06-15T00:00:00Z",
  },
  customerB: {
    id: "cust-B",
    name: "Bob B",
    phone: "0901234567",
    email: "bob@b.com",
    language: "en",
    notes: null,
    profileSummary: null,
    createdAt: "2026-06-15T00:00:00Z",
  },
  createdAt: "2026-06-15T00:00:00Z",
};

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

describe("MergeSuggestionDialog", () => {
  it("renders both customers' identifying fields side by side when open", () => {
    render(
      <MergeSuggestionDialog
        suggestion={suggestionFixture}
        onClose={() => {}}
      />,
    );

    // Customer A name + email rendered (each may appear in both the
    // side-by-side card and the field A/B radio).
    expect(screen.getAllByText("Alice A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("alice@a.com").length).toBeGreaterThan(0);

    // Customer B name + email rendered.
    expect(screen.getAllByText("Bob B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("bob@b.com").length).toBeGreaterThan(0);

    // Per-side labels (A / B) come from the translation key set.
    expect(
      screen.getByText("customers.suggestions.dialog.side.A"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("customers.suggestions.dialog.side.B"),
    ).toBeInTheDocument();
  });

  it("renders per-conflicting-field A/B radios for fields that have BOTH values populated", () => {
    render(
      <MergeSuggestionDialog
        suggestion={suggestionFixture}
        onClose={() => {}}
      />,
    );

    // The dialog uses translated field labels for each conflicting row.
    // 'phone' is set on both — there should be a labelled section for it.
    expect(
      screen.getByText("customers.suggestions.dialog.fields.phone"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("customers.suggestions.dialog.fields.email"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("customers.suggestions.dialog.fields.name"),
    ).toBeInTheDocument();
  });

  it("clicking Confirm calls useConfirmMerge with the default survivor (A) and the auto-resolved fieldResolutions map", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MergeSuggestionDialog
        suggestion={suggestionFixture}
        onClose={onClose}
      />,
    );

    const confirmBtn = screen.getByRole("button", {
      name: "customers.suggestions.actions.confirmMerge",
    });
    await user.click(confirmBtn);

    expect(confirmMutateAsync).toHaveBeenCalledTimes(1);
    const body = confirmMutateAsync.mock.calls[0][0];
    expect(body.survivorId).toBe("cust-A"); // default survivor is A
    // Field resolutions auto-resolve to 'A' when both have a value (the
    // default-when-conflict rule) or to the side that has a non-empty value.
    expect(body.fieldResolutions).toBeDefined();
    expect(body.fieldResolutions.phone).toBeDefined();
    expect(body.fieldResolutions.email).toBeDefined();
    // After a successful confirm the dialog should close.
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking Dismiss calls useDismissMerge and closes the dialog", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MergeSuggestionDialog
        suggestion={suggestionFixture}
        onClose={onClose}
      />,
    );

    const dismissBtn = screen.getByRole("button", {
      name: "customers.suggestions.actions.dismiss",
    });
    await user.click(dismissBtn);

    expect(dismissMutateAsync).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when the suggestion is null (drawer closed state)", () => {
    const { container } = render(
      <MergeSuggestionDialog suggestion={null} onClose={() => {}} />,
    );
    // Drawer is unmounted entirely; no dialog title visible.
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});

// Avoid unused-import error when the helper isn't needed.
void within;
