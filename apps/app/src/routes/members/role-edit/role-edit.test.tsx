import "@/i18n";
import { render, screen } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useRouteError,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const role = vi.hoisted(() => ({ current: {} as object }));

vi.mock("@/hooks/api/workspace-roles", () => ({
  useWorkspaceRole: () => ({ role: role.current, isLoading: false }),
  useUpdateWorkspaceRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { RoleEdit } from "./role-edit";

const Caught = () => {
  const error = useRouteError() as { status?: number };
  return <p>status {error.status}</p>;
};

describe("RoleEdit", () => {
  it("treats a built-in role as not found, so its permissions cannot be overwritten", async () => {
    role.current = {
      id: "r0",
      name: "Admin",
      type: "WORKSPACE_MEMBER",
      permissions: [],
    };
    const router = createMemoryRouter(
      [
        {
          path: "/roles/:id/edit",
          element: <RoleEdit />,
          errorElement: <Caught />,
        },
      ],
      { initialEntries: ["/roles/r0/edit"] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("status 404")).toBeInTheDocument();
  });
});
