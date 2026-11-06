import "@/i18n";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@medusajs/ui";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({ canCreate: true }));

vi.mock("@repo/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/auth")>()),
  useAbility: () => ({
    can: (action: string, subject: string) =>
      current.canCreate &&
      action === "create" &&
      subject === "CLIENT_CREDENTIAL",
  }),
}));
vi.mock("@/hooks/api", () => ({
  useWorkspace: () => ({ workspace: { slug: "kunmart", name: "Kunmart" } }),
}));
vi.mock("@/hooks/api/client-credentials", () => ({
  useClientCredentialList: () => ({
    credentials: [
      {
        id: "c1",
        name: "Claude Desktop",
        key: "pk_123",
        isActive: true,
        createdAt: "2026-11-01T00:00:00Z",
        createdBy: { id: "u1", name: "Ada", email: "ada@example.com" },
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useCreateClientCredential: () => ({
    mutateAsync: async () => ({ id: "c2", key: "pk_new", secret: "sk_new" }),
    isPending: false,
  }),
  useDeleteClientCredential: () => ({ mutateAsync: vi.fn() }),
  useRotateClientCredential: () => ({ mutateAsync: vi.fn() }),
}));

import { ClientCredentials } from "./client-credentials";

// The data table scrolls its body on render; jsdom has no layout.
Element.prototype.scroll = vi.fn();

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <MemoryRouter>
          <ClientCredentials />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );

describe("API keys page", () => {
  it("explains keys and shows the MCP quick start", () => {
    current.canCreate = true;
    renderPage();

    expect(screen.getByRole("heading", { name: "API keys" })).toBeTruthy();
    expect(
      screen.getByText(/Connect Kunmart to your own systems/),
    ).toBeTruthy();
    expect(screen.getByText("https://mcp.ecbot.dev/mcp")).toBeTruthy();
    expect(screen.getByText("x-api-key: <your key>")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /MCP setup guide/ }),
    ).toHaveAttribute("href", "https://ecbot.dev/en/docs/dev/mcp");
  });

  it("lists who created each key", () => {
    current.canCreate = true;
    renderPage();

    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers.slice(0, 5)).toEqual([
      "Name",
      "Key",
      "Created by",
      "Status",
      "Created",
    ]);
    expect(screen.getByText("Ada")).toBeTruthy();
  });

  it("tells members without permission who can create keys", () => {
    current.canCreate = false;
    renderPage();

    expect(screen.queryByRole("button", { name: "Create API key" })).toBeNull();
    expect(screen.getByTestId("api-keys-no-permission").textContent).toBe(
      "You can't create API keys in this workspace. Ask the owner or an admin.",
    );
  });

  it("keeps the new key open until it is copied or marked saved", async () => {
    current.canCreate = true;
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Create API key" }));
    const name = await screen.findByPlaceholderText(
      "e.g. Claude Desktop, Zapier",
    );
    expect(
      screen.getByText("Helps you recognise where this key is used."),
    ).toBeTruthy();
    await user.type(name, "Zapier");
    await user.click(screen.getByRole("button", { name: "Create" }));

    const dialog = await screen.findByRole("dialog", {
      name: "API key created",
    });
    expect(within(dialog).getByText("pk_new:sk_new")).toBeTruthy();
    expect(
      within(dialog).getByText(/"x-api-key": "pk_new:sk_new"/),
    ).toBeTruthy();

    const done = within(dialog).getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "API key created" }),
    ).toBeTruthy();

    await user.click(within(dialog).getByRole("checkbox"));
    expect(done).toBeEnabled();
  });
});
