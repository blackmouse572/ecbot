import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const owner = vi.hoisted(() => ({ isOwner: true, isPending: false }));
vi.mock("@/hooks/use-is-workspace-owner", () => ({
  useIsWorkspaceOwner: () => owner,
}));

vi.mock("@/hooks/api/workspace-roles", () => ({
  useWorkspaceRoles: vi.fn(),
  useDeleteWorkspaceRole: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock("@/components/table/data-table", () => ({
  _DataTable: () => <div>roles-table</div>,
}));

const translation = vi.hoisted(() => ({
  t: (key: string) => key,
  i18n: { language: "en" },
}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => translation,
}));

import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { RoleListTable } from "./role-list-table";

const apiError = (status: number, statusCode: number) => ({
  response: { status, data: { statusCode } },
});

const mockRoles = (state: Record<string, unknown>) =>
  vi.mocked(useWorkspaceRoles).mockReturnValue({
    roles: [],
    totals: 0,
    isLoading: false,
    ...state,
  } as A);

const renderTable = () => render(<RoleListTable />, { wrapper: MemoryRouter });

describe("RoleListTable", () => {
  beforeEach(() => {
    owner.isOwner = true;
    owner.isPending = false;
  });

  it("shows the owner the roles table", () => {
    mockRoles({});

    renderTable();

    expect(screen.getByText("roles-table")).toBeInTheDocument();
    expect(vi.mocked(useWorkspaceRoles).mock.lastCall?.[1]).toEqual({
      enabled: true,
    });
  });

  it("tells a member they can't view roles, without asking the API", () => {
    owner.isOwner = false;
    mockRoles({});

    renderTable();

    expect(screen.getByText("roles.list.noReadPermission")).toBeInTheDocument();
    expect(screen.queryByText("roles-table")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "actions.create" }),
    ).not.toBeInTheDocument();
    expect(vi.mocked(useWorkspaceRoles).mock.lastCall?.[1]).toEqual({
      enabled: false,
    });
  });

  it.each([
    ["the owner guard's 400 5208", apiError(400, 5208)],
    ["a 403", apiError(403, 5100)],
  ])("shows the no-permission message on %s", (_, error) => {
    mockRoles({ isError: true, error });

    renderTable();

    expect(screen.getByText("roles.list.noReadPermission")).toBeInTheDocument();
  });

  it("still throws a suspended workspace's 403 to the error boundary", () => {
    mockRoles({ isError: true, error: apiError(403, 5215) });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(renderTable).toThrow();
  });
});
