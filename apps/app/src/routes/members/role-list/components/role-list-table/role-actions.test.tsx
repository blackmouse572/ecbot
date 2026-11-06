import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prompt = vi.hoisted(() => vi.fn(async () => true));
const deleteRole = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/hooks/api/workspace-roles", () => ({
  useDeleteWorkspaceRole: () => ({ mutateAsync: deleteRole }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));
vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, usePrompt: () => prompt, toast };
});
vi.mock("@repo/ui/common-components", () => ({
  ActionMenu: ({
    groups,
  }: {
    groups: { actions: { label: string; onClick: () => void }[] }[];
  }) => (
    <>
      {groups
        .flatMap((g) => g.actions)
        .map((a) => (
          <button key={a.label} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
    </>
  ),
}));

import { RoleActions } from "./role-actions";

const renderActions = (role: object) =>
  render(
    <MemoryRouter>
      <RoleActions item={{ id: "r1", type: "USER", ...role } as never} />
    </MemoryRouter>,
  );

describe("RoleActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the role through the API after confirming", async () => {
    deleteRole.mockResolvedValue({});
    renderActions({});

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith("r1"));
    expect(toast.success).toHaveBeenCalledWith("Role deleted");
  });

  it("shows the API's reason when the role cannot be deleted", async () => {
    deleteRole.mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: "This role is currently in use and cannot be deleted.",
        },
      },
    });
    renderActions({});

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This role is currently in use and cannot be deleted.",
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("offers no edit or delete on built-in roles", () => {
    renderActions({ type: "WORKSPACE_MEMBER" });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
