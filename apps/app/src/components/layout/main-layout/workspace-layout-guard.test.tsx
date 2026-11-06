import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ALPHA = { id: "1", slug: "alpha", name: "Alpha shop" };
let ensured: Record<string, unknown> = {};

vi.mock("@/hooks/api/workspace", () => ({
  useEnsureWorkspace: () => ensured,
  useWorkspaceList: () => ({ workspaces: [ALPHA] }),
  resolveWorkspaceSlug: () => ALPHA.slug,
}));

import { MainLayout } from "./main-layout";
import { WorkspaceSettingsLayout } from "./workspace-setting-layout";

const renderLayout = (Layout: React.FC, path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path=":workspaceSlug" element={<Layout />}>
          <Route path="*" element={<p>page content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

// QA gate D10: the crash was layout-level. The shell and its outlet rendered
// before the workspace check, so a page ran against a workspace that never
// loaded. Both layouts must stop before the shell.
describe.each([
  ["MainLayout", MainLayout, "/x/dashboard"],
  [
    "WorkspaceSettingsLayout",
    WorkspaceSettingsLayout,
    "/x/settings/client-credentials",
  ],
])("%s with a workspace the user cannot open", (_, Layout, path) => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Workspace not found and never renders the page", () => {
    ensured = {
      isLoading: false,
      hasWorkspaces: true,
      isNotFound: true,
      isSuspended: false,
      workspace: undefined,
    };
    renderLayout(Layout, path);

    expect(screen.getByText("Workspace not found")).toBeTruthy();
    expect(screen.queryByText("page content")).toBeNull();
  });

  it("shows the suspended page and never renders the page", () => {
    ensured = {
      isLoading: false,
      hasWorkspaces: true,
      isNotFound: false,
      isSuspended: true,
      workspace: undefined,
    };
    renderLayout(Layout, path);

    expect(screen.getByText("This workspace is suspended")).toBeTruthy();
    expect(screen.queryByText("page content")).toBeNull();
  });
});
