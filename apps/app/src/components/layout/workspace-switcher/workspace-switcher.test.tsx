import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({
  user: undefined as unknown,
}));

vi.mock("@/hooks/api", () => ({
  useMe: () => ({ user: current.user }),
}));

import { WorkspaceSwitcher } from "./workspace-switcher";

const workspace = (slug: string, name: string) =>
  ({ id: slug, slug, name }) as WorkSpaceGetResponseDto;
const a = workspace("a", "Mộc Café");
const b = workspace("b", "iStore");

const member = (roleName: string) => ({
  isOwner: false,
  workspaceMember: { role: { name: roleName } },
});

const Location = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const openSwitcher = async (path = "/a/chatbot") => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path=":workspaceSlug/*"
          element={
            <>
              <WorkspaceSwitcher workspace={a} workspaces={[a, b]} />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Mộc Café/ }));
  return user;
};

describe("WorkspaceSwitcher", () => {
  it("shows the user's role under the workspace name", async () => {
    current.user = { isOwner: true };
    await openSwitcher();
    expect(screen.getByText("Owner")).toBeTruthy();
  });

  it.each([
    ["Admin", "Admin"],
    ["Member", "Member"],
    ["Sales lead", "Sales lead"],
  ])("labels the %s role as %s", async (roleName, label) => {
    current.user = member(roleName);
    await openSwitcher();
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("marks the current workspace with a check and does not link it", async () => {
    current.user = member("Member");
    await openSwitcher();

    const row = screen.getByTestId("current-workspace");
    expect(row.textContent).toContain("Mộc Café");
    expect(row.querySelector("[aria-label='Current workspace']")).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /Mộc Café/ })).toBeNull();
  });

  it("links any member to workspace settings, the team and API keys", async () => {
    current.user = member("Member");
    await openSwitcher();

    const href = (name: string) =>
      screen.getByRole("menuitem", { name }).getAttribute("href");
    expect(href("Workspace settings")).toBe("/a/settings/workspace");
    expect(href("Team")).toBe("/a/settings/members");
    expect(href("API keys")).toBe("/a/settings/client-credentials");
  });

  it("switches to the list page of the same section", async () => {
    current.user = member("Member");
    const user = await openSwitcher("/a/chatbot/123");

    await user.click(screen.getByRole("menuitem", { name: /iStore/ }));

    expect(screen.getByTestId("location").textContent).toBe("/b/chatbot");
  });

  it("keeps the settings page when switching from settings", async () => {
    current.user = member("Member");
    const user = await openSwitcher("/a/settings/members/9");

    await user.click(screen.getByRole("menuitem", { name: /iStore/ }));

    expect(screen.getByTestId("location").textContent).toBe(
      "/b/settings/members",
    );
  });
});
