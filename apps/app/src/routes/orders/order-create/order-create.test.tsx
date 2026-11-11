import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  orders: new Array<Record<string, unknown>>(),
  groups: new Array<Record<string, unknown>>(),
  /** Errors the next order or group saves throw, one per call. */
  orderErrors: new Array<unknown>(),
  groupErrors: new Array<unknown>(),
  handleSuccess: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");

  return { ...actual, toast };
});

vi.mock("@/hooks/api/orders", () => ({
  useCreateOrder: () => ({
    mutateAsync: async (body: Record<string, unknown>) => {
      const error = api.orderErrors.shift();

      if (error) throw error;
      api.orders.push(body);

      return { id: "o-1", ...body };
    },
    isPending: false,
  }),
}));

vi.mock("@/hooks/api/product-groups", () => ({
  useProductGroups: () => ({
    groups: [{ id: "g-serum", name: "Serum", createdAt: "" }],
  }),
  useCreateProductGroup: () => ({
    mutateAsync: async (body: { name: string }) => {
      const error = api.groupErrors.shift();

      if (error) throw error;
      api.groups.push(body);

      return { id: `g-${body.name}`, name: body.name, createdAt: "" };
    },
  }),
}));

// The pickers search as you type; here each is a button that picks one value.
vi.mock("../components/customer-combobox", () => ({
  CustomerCombobox: ({ onChange }: { onChange: (id: string) => void }) => (
    <button type="button" onClick={() => onChange("c-ha")}>
      pick Hà
    </button>
  ),
}));

vi.mock("../components/product-group-combobox", () => ({
  ProductGroupCombobox: ({
    onChange,
  }: {
    onChange: (group: { id?: string; name: string }) => void;
  }) => (
    <button type="button" onClick={() => onChange({ name: "Tẩy trang" })}>
      new group
    </button>
  ),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    useRouteModal: () => ({ handleSuccess: api.handleSuccess }),
    RouteFocusModal: Object.assign(Pass, {
      Form: ({
        form,
        children,
      }: {
        form: UseFormReturn;
        children: ReactNode;
      }) => <Form {...form}>{children}</Form>,
      Header: Pass,
      Title: Pass,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { OrderCreate } from "./order-create";

const renderCreate = () =>
  render(
    <MemoryRouter initialEntries={["/ws/orders/create"]}>
      <Routes>
        <Route path="/:workspaceSlug/orders/create" element={<OrderCreate />} />
      </Routes>
    </MemoryRouter>,
  );

const conflict = { response: { status: 409, data: {} } };

const fillWithNewGroup = () => {
  fireEvent.click(screen.getByText("pick Hà"));
  fireEvent.change(screen.getByLabelText("Product name"), {
    target: { value: "Nước tẩy trang" },
  });
  fireEvent.click(screen.getByText("new group"));
};

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save order" }));

describe("OrderCreate", () => {
  beforeEach(() => {
    api.orders = [];
    api.groups = [];
    api.orderErrors = [];
    api.groupErrors = [];
    api.handleSuccess.mockReset();
    toast.error.mockReset();
  });

  it("asks for the customer before saving", async () => {
    renderCreate();
    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "Serum C" },
    });
    save();

    await waitFor(() =>
      expect(screen.getByText(/Pick the customer/)).toBeTruthy(),
    );
    expect(api.orders).toEqual([]);
  });

  it("creates a typed group first, then the confirmed order with its total", async () => {
    renderCreate();
    fireEvent.click(screen.getByText("pick Hà"));
    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "Nước tẩy trang" },
    });
    fireEvent.click(screen.getByText("new group"));
    fireEvent.change(screen.getByLabelText("Qty"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Unit price"), {
      target: { value: "120.000" },
    });
    save();

    await waitFor(() => expect(api.handleSuccess).toHaveBeenCalled());
    expect(api.groups).toEqual([{ name: "Tẩy trang" }]);
    expect(api.orders).toEqual([
      expect.objectContaining({
        customerId: "c-ha",
        code: undefined,
        items: [
          {
            name: "Nước tẩy trang",
            quantity: 2,
            unitPrice: 120000,
            productGroupId: "g-Tẩy trang",
          },
        ],
        total: 240000,
        status: "CONFIRMED",
      }),
    ]);
  });

  it("reuses the group it made when the shop saves again after a failed order", async () => {
    api.orderErrors = [new Error("network")];
    renderCreate();
    fillWithNewGroup();
    save();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    save();

    await waitFor(() => expect(api.handleSuccess).toHaveBeenCalled());
    expect(api.groups).toEqual([{ name: "Tẩy trang" }]);
    expect(api.orders).toEqual([
      expect.objectContaining({
        items: [expect.objectContaining({ productGroupId: "g-Tẩy trang" })],
      }),
    ]);
  });

  it("does not blame the order code when the group cannot be made", async () => {
    api.groupErrors = [conflict];
    renderCreate();
    fillWithNewGroup();
    save();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(api.orders).toEqual([]);
    expect(screen.queryByText(/order code is taken/)).toBeNull();
  });

  it("adds another product row", () => {
    renderCreate();
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getAllByLabelText("Product name")).toHaveLength(2);
  });
});
