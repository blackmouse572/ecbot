import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import { describe, expect, it, vi } from "vitest";

const prompt = vi.fn(async () => true);
const unlink = vi.fn(async () => undefined);

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    usePrompt: () => prompt,
    toast: { success: vi.fn(), error: vi.fn() },
  };
});

vi.mock("@repo/ui/common-components", () => ({
  ActionMenu: ({
    groups,
  }: {
    groups: { actions: { label: string; onClick?: () => void }[] }[];
  }) => (
    <div>
      {groups
        .flatMap((group) => group.actions)
        .map((action) => (
          <button key={action.label} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  ),
}));

vi.mock("@/hooks/api", () => ({
  useUnLinkAccount: () => ({ mutateAsync: unlink }),
}));

import { AccountGeneralSection } from "./account-general-section";

describe("AccountGeneralSection", () => {
  it("goes back to the channel list after the channel is disconnected", async () => {
    render(
      <MemoryRouter initialEntries={["/acme/accounts/acc-1"]}>
        <Routes>
          <Route
            path="/:workspaceSlug/accounts/:id"
            element={
              <AccountGeneralSection
                item={
                  {
                    id: "acc-1",
                    name: "Shop",
                    link: "",
                    status: "ACTIVE",
                  } as never
                }
              />
            }
          />
          <Route
            path="/:workspaceSlug/accounts"
            element={<div>channel-list</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Unlink Account" }));

    await waitFor(() =>
      expect(screen.getByText("channel-list")).toBeInTheDocument(),
    );
    expect(unlink).toHaveBeenCalledWith("acc-1");
  });
});
