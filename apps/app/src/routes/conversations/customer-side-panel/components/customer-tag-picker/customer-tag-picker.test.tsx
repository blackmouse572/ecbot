import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AbilityProvider, PolicyAbilityFactory } from "@repo/auth";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createMutateAsync, toastError } = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/api/customer-tags", () => ({
  useCreateCustomerTag: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
}));

// jsdom has no scrollIntoView; cmdk calls it on the highlighted row.
Element.prototype.scrollIntoView = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) =>
      opts?.query ? `${key}:${opts.query}` : key,
  }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { success: vi.fn(), error: toastError },
  };
});

import { CustomerTagPicker } from "./customer-tag-picker";

const tag = (id: string, name: string, emoji: string) => ({
  id,
  name,
  emoji,
  triggersHandoff: false,
  createdAt: "2026-11-06T00:00:00Z",
});

const CATALOG = [
  tag("t-vip", "VIP", "⭐"),
  tag("t-new", "Khách mới", "🆕"),
  tag("t-complaint", "Khiếu nại", "📣"),
  tag("t-order", "Đơn hàng mới", "🛒"),
];

// The default Member role manages customers (and so may create tags); a
// read-only role may not.
const CAN_CREATE = [{ action: ["manage"], subject: "CUSTOMER" }];
const READ_ONLY = [{ action: ["read"], subject: "CUSTOMER" }];

const renderPicker = (
  {
    rules = CAN_CREATE,
    applied = [] as string[],
  }: { rules?: typeof CAN_CREATE; applied?: string[] } = {},
  onApply = vi.fn(),
  onRemove = vi.fn(),
) => {
  const ui: ReactElement = (
    <AbilityProvider
      ability={PolicyAbilityFactory.createForMember(
        rules as A,
        "WORKSPACE_MEMBER",
      )}
    >
      <CustomerTagPicker
        tags={CATALOG}
        appliedTagIds={new Set(applied)}
        onApply={onApply}
        onRemove={onRemove}
      />
    </AbilityProvider>
  );
  render(ui);
  return { onApply, onRemove };
};

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    screen.getByRole("button", {
      name: "conversations.customer.panel.tags.add",
    }),
  );
  return screen.findByPlaceholderText(
    "conversations.customer.panel.tags.searchPlaceholder",
  );
};

const optionNames = () =>
  screen.queryAllByRole("option").map((o) => o.textContent ?? "");

afterEach(() => {
  vi.clearAllMocks();
});

describe("CustomerTagPicker", () => {
  it("focuses the search input when the menu opens", async () => {
    const user = userEvent.setup();
    renderPicker();
    const input = await open(user);
    await waitFor(() => expect(input).toHaveFocus());
    expect(optionNames()).toHaveLength(4);
  });

  it("filters by tag name, ignoring case and Vietnamese diacritics", async () => {
    const user = userEvent.setup();
    renderPicker();
    const input = await open(user);

    await user.type(input, "khieu");
    expect(optionNames()).toEqual([expect.stringContaining("Khiếu nại")]);

    await user.clear(input);
    await user.type(input, "KHÁCH");
    expect(optionNames()).toEqual([expect.stringContaining("Khách mới")]);
  });

  it("matches đ/Đ when the query types a plain d", async () => {
    const user = userEvent.setup();
    renderPicker();
    const input = await open(user);

    await user.type(input, "don hang");
    expect(optionNames()).toEqual([expect.stringContaining("Đơn hàng mới")]);
  });

  it("applies the highlighted tag with arrow keys and Enter", async () => {
    const user = userEvent.setup();
    const { onApply } = renderPicker();
    await open(user);

    // The first row starts highlighted; ArrowDown moves to the second.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onApply).toHaveBeenCalledWith("t-new");
  });

  it("shows applied tags checked and removes them on select", async () => {
    const user = userEvent.setup();
    const { onApply, onRemove } = renderPicker({ applied: ["t-vip"] });
    await open(user);

    const vip = screen.getByRole("option", { name: /VIP/ });
    expect(vip).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("option", { name: /Khách mới/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await user.click(vip);
    expect(onRemove).toHaveBeenCalledWith("t-vip");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderPicker();
    const input = await open(user);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(input).not.toBeInTheDocument());
  });

  it("offers to create the tag when nothing matches and the member may create tags", async () => {
    const user = userEvent.setup();
    createMutateAsync.mockResolvedValue(tag("t-made", "Giao gấp", ""));
    const { onApply } = renderPicker();
    const input = await open(user);

    await user.type(input, "Giao gấp");
    expect(
      screen.getByText("conversations.customer.panel.tags.noResults"),
    ).toBeInTheDocument();
    const create = screen.getByRole("option", {
      name: "conversations.customer.panel.tags.create:Giao gấp",
    });

    await user.click(create);
    expect(createMutateAsync).toHaveBeenCalledWith({ name: "Giao gấp" });
    await waitFor(() => expect(onApply).toHaveBeenCalledWith("t-made"));
  });

  it("shows only the empty text when the member may not create tags", async () => {
    const user = userEvent.setup();
    renderPicker({ rules: READ_ONLY });
    const input = await open(user);

    await user.type(input, "Giao gấp");
    expect(
      screen.getByText("conversations.customer.panel.tags.noResults"),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("shows the name-taken message when the new tag name already exists", async () => {
    const user = userEvent.setup();
    // The client rejects with the axios error; the status sits on `response`.
    createMutateAsync.mockRejectedValue({ response: { status: 409 } });
    const { onApply } = renderPicker();
    const input = await open(user);

    await user.type(input, "Giao gấp{Enter}");
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "settings.customerTags.errors.nameTaken",
      ),
    );
    expect(onApply).not.toHaveBeenCalled();
  });
});
