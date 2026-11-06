import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { WorkSpaceGetResponseDto } from "@repo/client";

const current = vi.hoisted(() => ({ isWorkspaceOwner: true }));

vi.mock("@/modules/auth", () => ({
  useWorkspaceAbilities: () => ({ isWorkspaceOwner: current.isWorkspaceOwner }),
}));

import { Header, WorkspaceSettingsItem } from "./main-layout";

const workspace = {
  id: "ws1",
  slug: "kunmart",
  name: "Kunmart",
} as WorkSpaceGetResponseDto;

const renderAt = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={["/kunmart/chatbot"]}>
      <Routes>
        <Route path=":workspaceSlug/*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

describe("WorkspaceSettingsItem", () => {
  it("links owners to the workspace settings home", () => {
    current.isWorkspaceOwner = true;

    renderAt(<WorkspaceSettingsItem />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/kunmart/settings/workspace",
    );
  });

  it("is absent for members", () => {
    current.isWorkspaceOwner = false;

    renderAt(<WorkspaceSettingsItem />);

    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });
});

describe("workspace switcher", () => {
  const openSwitcher = async () => {
    renderAt(<Header workspace={workspace} workspaces={[workspace]} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Kunmart/ }));
  };

  it("opens the settings home from its Settings item", async () => {
    current.isWorkspaceOwner = true;

    await openSwitcher();

    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/kunmart/settings/workspace",
    );
  });

  it("shows the current workspace as a label, not a second link", async () => {
    current.isWorkspaceOwner = true;

    await openSwitcher();

    expect(screen.queryByRole("menuitem", { name: /Kunmart/ })).toBeNull();
  });

  it("hides Settings from members", async () => {
    current.isWorkspaceOwner = false;

    await openSwitcher();

    expect(screen.queryByRole("menuitem", { name: "Settings" })).toBeNull();
  });
});
