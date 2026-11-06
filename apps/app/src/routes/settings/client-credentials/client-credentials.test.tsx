import "@/i18n";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@medusajs/ui";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Actions the signed-in member holds on CLIENT_CREDENTIAL. "manage" stands
// for every action, as in CASL (owners and the built-in Admin role).
const current = vi.hoisted(() => ({
  actions: ["manage"] as string[],
  listError: null as unknown,
  listEnabled: undefined as boolean | undefined,
}));

vi.mock("@repo/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/auth")>()),
  useAbility: () => ({
    can: (action: string, subject: string) =>
      subject === "CLIENT_CREDENTIAL" &&
      (current.actions.includes("manage") || current.actions.includes(action)),
  }),
}));
vi.mock("@/hooks/api", () => ({
  useWorkspace: () => ({ workspace: { slug: "kunmart", name: "Kunmart" } }),
}));
vi.mock("@/hooks/api/client-credentials", () => ({
  useClientCredentialList: ({ enabled }: { enabled: boolean }) => {
    current.listEnabled = enabled;
    return {
      isError: enabled && !!current.listError,
      error: current.listError,
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
    };
  },
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

const forbidden = { response: { status: 403, data: { statusCode: 5100 } } };

describe("API keys page", () => {
  beforeEach(() => {
    current.actions = ["manage"];
    current.listError = null;
  });

  it("explains keys and shows the MCP quick start", () => {
    current.actions = ["manage"];
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
    current.actions = ["manage"];
    renderPage();

    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers.slice(0, 5)).toEqual([
      "Name",
      "Key ID",
      "Created by",
      "Status",
      "Created",
    ]);
    expect(screen.getByText("Ada")).toBeTruthy();
  });

  it("tells members without permission who can create keys", () => {
    current.actions = ["read"];
    renderPage();

    expect(screen.queryByRole("button", { name: "Create API key" })).toBeNull();
    expect(screen.getByTestId("api-keys-no-permission").textContent).toBe(
      "You can't create API keys in this workspace. Ask the owner or an admin.",
    );
  });

  it("keeps the new key open until it is copied or marked saved", async () => {
    current.actions = ["manage"];
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
    expect(
      within(dialog).getByText(
        "The full key is the Key ID plus the secret. Only this full value works.",
      ),
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

  const openRowMenu = async () => {
    const user = userEvent.setup();
    const row = screen.getByText("Claude Desktop").closest("tr")!;
    const trigger = within(row).queryByRole("button");
    if (trigger) await user.click(trigger);
    return trigger;
  };

  it.each([
    ["the owner", ["manage"]],
    ["an admin", ["manage"]],
  ])("lets %s rotate and delete a key", async (_who, actions) => {
    current.actions = actions;
    renderPage();

    expect(await openRowMenu()).toBeTruthy();
    expect(await screen.findByText("Rotate secret")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("offers only the actions the member is allowed", async () => {
    current.actions = ["read", "delete"];
    renderPage();

    await openRowMenu();
    expect(await screen.findByText("Delete")).toBeTruthy();
    expect(screen.queryByText("Rotate secret")).toBeNull();
  });

  it("drops the actions column for a member who may only read", async () => {
    current.actions = ["read"];
    renderPage();

    expect(await openRowMenu()).toBeNull();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });

  it("explains the key ID column", () => {
    renderPage();

    expect(
      screen.getByLabelText(
        "Public ID only. The full key is shown once, when you create it.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("pk_123").className).toContain("text-ui-fg-muted");
  });

  it("does not ask for keys a member may not read", () => {
    current.actions = [];
    renderPage();

    expect(current.listEnabled).toBe(false);
    expect(screen.getByTestId("api-keys-no-access").textContent).toBe(
      "You can't view API keys in this workspace. Ask the owner or an admin.",
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("button", { name: "Create API key" })).toBeNull();
  });

  it("shows the same message when the list call answers 403", () => {
    current.actions = ["manage"];
    current.listError = forbidden;
    renderPage();

    expect(screen.getByTestId("api-keys-no-access")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
