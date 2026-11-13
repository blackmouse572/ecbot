import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ confirmed: vi.fn() }));

const order = (status: string, overrides = {}) => ({
  id: `o-${status}`,
  code: `DH-${status}`,
  customerId: "c-1",
  status,
  source: "CHAT",
  total: 960000,
  currency: "VND",
  orderedAt: "2026-10-02T08:00:00.000Z",
  items: [
    { id: "i-1", name: "Kem chống nắng", quantity: 2 },
    { id: "i-2", name: "Sữa rửa mặt", quantity: 1 },
  ],
  ...overrides,
});

vi.mock("@/hooks/api/orders", () => ({
  useCustomerOrderSummary: () => ({
    summary: {
      confirmedOrders: 3,
      totalSpent: 2430000,
      lastOrderedAt: "2026-10-02T08:00:00.000Z",
    },
  }),
  useOrders: (_workspace: string, query: { status: string }) => ({
    orders: [order(query.status)],
    isLoading: false,
  }),
  useConfirmOrder: () => ({ mutateAsync: api.confirmed, isPending: false }),
  useCancelOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { OrdersSection } from "./orders-section";

const Where = () => {
  const location = useLocation();

  return (
    <span data-testid="where">
      {location.pathname}
      {location.search} from {String(location.state?.from)}
    </span>
  );
};

const renderSection = () =>
  render(
    <MemoryRouter initialEntries={["/ws/conversations/conv-1"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/conversations/:id"
          element={<OrdersSection customerId="c-1" />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("OrdersSection", () => {
  beforeEach(() => api.confirmed.mockReset());

  it("sums the customer's orders and lists a pending one to confirm", async () => {
    renderSection();

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText(/2,430,000/)).toBeTruthy();
    expect(screen.getByText("DH-CONFIRMED")).toBeTruthy();
    expect(
      screen.getAllByText("Kem chống nắng × 2, Sữa rửa mặt × 1"),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(api.confirmed).toHaveBeenCalled());
  });

  it("adds an order for this customer and comes back to the conversation", () => {
    renderSection();

    fireEvent.click(screen.getByRole("link", { name: "Add order" }));

    expect(screen.getByTestId("where").textContent).toBe(
      "/ws/orders/create?customer=c-1 from /ws/conversations/conv-1",
    );
  });
});
