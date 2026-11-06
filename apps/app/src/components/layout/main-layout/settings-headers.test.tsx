import "@/i18n";
import { render, screen } from "@testing-library/react";
import type { WorkSpaceGetResponseDto } from "@repo/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const workspace = {
  id: "ws1",
  slug: "kunmart",
  name: "Kunmart",
} as WorkSpaceGetResponseDto;

vi.mock("@/hooks/api", () => ({
  useMe: () => ({ user: { isOwner: false } }),
}));
vi.mock("@/hooks/api/workspace", () => ({
  useEnsureWorkspace: () => ({ workspace }),
  useWorkspaceList: () => ({ workspaces: [workspace] }),
  useResolvedWorkspaceSlug: () => ({ slug: "kunmart" }),
}));

import { AccountSettingsHeader } from "./setting-layout";
import { WorkspaceSettingsHeader } from "./workspace-setting-layout";

const renderAt = (path: string, ui: React.ReactNode, state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path=":workspaceSlug/*" element={ui} />
        <Route path="settings/*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

describe("WorkspaceSettingsHeader", () => {
  it("shows the workspace switcher and a plain back link", () => {
    renderAt("/kunmart/settings/members", <WorkspaceSettingsHeader />);

    expect(screen.getByRole("button", { name: /Kunmart/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/kunmart/dashboard",
    );
  });

  it("goes back to the page the user came from", () => {
    renderAt("/kunmart/settings/members", <WorkspaceSettingsHeader />, {
      from: "/kunmart/chatbot/42",
    });

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/kunmart/chatbot/42",
    );
  });
});

describe("account settings", () => {
  it("goes back to the last workspace", () => {
    renderAt("/settings/profile", <AccountSettingsHeader />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/kunmart/dashboard",
    );
  });
});
