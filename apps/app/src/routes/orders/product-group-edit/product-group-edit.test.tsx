import "@/i18n";
import { Form } from "@repo/ui/common-components";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api/product-groups", () => ({
  useProductGroups: () => ({
    groups: [{ id: "g-serum", name: "Serum", createdAt: "" }],
    isLoading: false,
    isError: false,
  }),
  useCreateProductGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProductGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
    RouteDrawer: Object.assign(Pass, {
      Header: Pass,
      Title: Pass,
      Description: Pass,
      Body: Pass,
      Form: ({
        form,
        children,
      }: {
        form: UseFormReturn;
        children: ReactNode;
      }) => <Form {...form}>{children}</Form>,
      Footer: Pass,
      Close: Pass,
    }),
  };
});

import { ProductGroupEdit } from "./product-group-edit";

const renderAt = (groupId: string) =>
  render(
    <MemoryRouter initialEntries={[`/ws/orders/groups/${groupId}/edit`]}>
      <Routes>
        <Route
          path="/:workspaceSlug/orders/groups/:groupId/edit"
          element={<ProductGroupEdit />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ProductGroupEdit", () => {
  it("says the group is gone instead of loading forever", () => {
    renderAt("g-deleted");

    expect(
      screen.getByText("This product group no longer exists"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Product group")).toBeNull();
  });

  it("opens the form for a group that exists", () => {
    renderAt("g-serum");

    expect(screen.getByDisplayValue("Serum")).toBeTruthy();
  });
});
