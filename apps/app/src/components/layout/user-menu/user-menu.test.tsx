import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({
  workspace: undefined as { slug: string } | undefined,
  isWorkspaceOwner: true,
}));

vi.mock("@/modules/auth", () => ({
  useWorkspaceAbilities: () => ({ isWorkspaceOwner: current.isWorkspaceOwner }),
}));

// Mirrors the enterprise sidebar sections (the subscription badge): they read
// the current workspace, so mounting one without a workspace throws.
vi.mock("@/routes/enterprise.user-section", () => ({
  enterpriseUserSection: () => [
    () => (
      <span data-testid="enterprise-section">{current.workspace.slug}</span>
    ),
  ],
}));

vi.mock("@/hooks/api", () => ({
  useMe: () => ({
    user: { name: "Ada", email: "ada@example.com" },
    isPending: false,
    isError: false,
  }),
  useLogout: () => vi.fn(),
  useWorkspace: () => ({ workspace: current.workspace }),
}));

vi.mock("../../../providers/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

import { UserMenu } from "./user-menu";

describe("UserMenu enterprise sections", () => {
  it("stays unmounted where the URL carries no workspace", () => {
    current.workspace = undefined;

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("enterprise-section")).toBeNull();
  });

  it("mounts once a workspace is resolved", () => {
    current.workspace = { slug: "kunmart" };

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("enterprise-section")).toHaveTextContent(
      "kunmart",
    );
  });
});

describe("UserMenu workspace settings link", () => {
  const openMenu = async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <UserMenu />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: /Ada/ }));
  };

  it("links owners to the workspace settings", async () => {
    current.workspace = { slug: "kunmart" };
    current.isWorkspaceOwner = true;

    await openMenu();

    expect(
      screen.getByRole("menuitem", { name: "Workspace settings" }),
    ).toHaveAttribute("href", "/kunmart/settings/workspace");
  });

  it("hides the link from members", async () => {
    current.workspace = { slug: "kunmart" };
    current.isWorkspaceOwner = false;

    await openMenu();

    expect(
      screen.queryByRole("menuitem", { name: "Workspace settings" }),
    ).toBeNull();
  });

  it("hides the link where the URL carries no workspace", async () => {
    current.workspace = undefined;
    current.isWorkspaceOwner = true;

    await openMenu();

    expect(
      screen.queryByRole("menuitem", { name: "Workspace settings" }),
    ).toBeNull();
  });
});
