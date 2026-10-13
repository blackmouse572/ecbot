import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({
  workspace: undefined as { slug: string } | undefined,
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
