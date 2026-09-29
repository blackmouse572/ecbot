import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const prompt = vi.hoisted(() => vi.fn(async () => false));

vi.mock("@/hooks/api", () => ({
  useMe: () => ({ user: { id: "me" } }),
  useDeleteWorkspaceMember: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));
vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, usePrompt: () => prompt };
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

import { MemberRowActions } from "./member-row-actions";

describe("MemberRowActions", () => {
  it("labels the remove confirmation with what it does", async () => {
    render(
      <MemoryRouter>
        <MemberRowActions
          member={{ id: "m1", user: { id: "u2", name: "Lan" } } as never}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));

    await waitFor(() =>
      expect(prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmText: "Remove member",
          cancelText: "Cancel",
          variant: "danger",
        }),
      ),
    );
  });
});
