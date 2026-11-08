import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({
  user: undefined as unknown,
  invitations: [] as unknown[],
  accepted: [] as string[],
  declined: [] as string[],
}));

vi.mock("@/hooks/api", () => ({
  useMe: () => ({ user: current.user }),
}));
vi.mock("@/hooks/api/workspace-member", () => ({
  useMyInvitations: () => ({ invitations: current.invitations }),
  useAcceptMyInvitation: () => ({
    isPending: false,
    mutateAsync: async (id: string) => {
      current.accepted.push(id);
      return {
        workspace: { id: "ws-c", name: "Tiệm Bánh", slug: "c" },
        roleName: "Member",
      };
    },
  }),
  useDeclineMyInvitation: () => ({
    isPending: false,
    mutateAsync: async (id: string) => {
      current.declined.push(id);
    },
  }),
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
  beforeEach(() => {
    current.invitations = [];
    current.accepted = [];
    current.declined = [];
  });
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

  describe("invitations", () => {
    const invitation = {
      id: "inv-1",
      workspace: { id: "ws-c", name: "Tiệm Bánh", slug: "c" },
      inviterName: "Lan",
      roleName: "Member",
      expiresAt: "2026-11-15T00:00:00.000Z",
    };

    it("has no group and no dot without invitations", async () => {
      current.user = member("Member");
      await openSwitcher();

      expect(screen.queryByText("Invitations")).toBeNull();
      expect(screen.queryByTestId("invitations-dot")).toBeNull();
    });

    it("shows a dot on the trigger and an Invitations group above Create workspace", async () => {
      current.user = member("Member");
      current.invitations = [invitation];
      await openSwitcher();

      expect(screen.getByTestId("invitations-dot")).toBeTruthy();
      expect(screen.getByText("1 pending invitation")).toBeTruthy();
      expect(
        screen.getByText("Lan invited you to Tiệm Bánh as Member"),
      ).toBeTruthy();

      const items = screen
        .getAllByRole("menuitem")
        .map((item) => item.textContent);
      const accept = items.indexOf("Accept");
      expect(accept).toBeGreaterThan(-1);
      expect(items.indexOf("Decline")).toBeGreaterThan(-1);
      expect(items.findIndex((text) => /Create/i.test(text ?? ""))).toBe(
        items.length - 1,
      );
    });

    it("Accept joins and opens that workspace's dashboard", async () => {
      current.user = member("Member");
      current.invitations = [invitation];
      const user = await openSwitcher();

      await user.click(screen.getByRole("menuitem", { name: "Accept" }));

      expect(current.accepted).toEqual(["inv-1"]);
      expect(screen.getByTestId("location").textContent).toBe("/c/dashboard");
    });

    it("Decline declines it", async () => {
      current.user = member("Member");
      current.invitations = [invitation];
      const user = await openSwitcher();

      await user.click(screen.getByRole("menuitem", { name: "Decline" }));

      expect(current.declined).toEqual(["inv-1"]);
    });
  });
});
