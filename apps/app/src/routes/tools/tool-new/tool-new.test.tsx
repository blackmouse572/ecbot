import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  enabled: [] as { chatbotId: string; toolId: string; body: unknown }[],
  prev: undefined as unknown,
  handleSuccess: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});

vi.mock("@/hooks/api/tools", () => ({
  useEnableToolOnChatbot: (_ws: string, chatbotId: string) => ({
    enableToolOnChatbot: async (args: { toolId: string; body: unknown }) => {
      api.enabled.push({ chatbotId, ...args });
    },
  }),
}));

// Each step is its own form; here a click stands in for a successful create.
vi.mock("./components/http-create-step", () => ({
  HttpCreateStep: ({ onSuccess }: { onSuccess: (id?: string) => void }) => (
    <button type="button" onClick={() => onSuccess("tool-1")}>
      create-http
    </button>
  ),
}));
vi.mock("./components/mcp-create-step", () => ({ McpCreateStep: () => null }));
vi.mock("./components/marketplace-browse-step", () => ({
  MarketplaceBrowseStep: () => null,
}));
vi.mock("./components/success-step", () => ({
  SuccessStep: () => <p>success-step</p>,
}));

vi.mock("@/components/modals", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    useRouteModal: () => ({ handleSuccess: api.handleSuccess }),
    RouteFocusModal: Object.assign(
      ({ prev, children }: { prev?: string; children?: ReactNode }) => {
        api.prev = prev;
        return <>{children}</>;
      },
      { Header: Pass, Body: Pass, Title: Pass, Description: Pass },
    ),
  };
});

import { ToolNew } from "./tool-new";

const renderAt = (url: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/:workspaceSlug/tools/new" element={<ToolNew />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const createHttpTool = () => {
  fireEvent.click(screen.getByText("HTTP Tool"));
  fireEvent.click(screen.getByText("create-http"));
};

describe("ToolNew", () => {
  beforeEach(() => {
    api.enabled = [];
    api.prev = undefined;
    api.handleSuccess.mockReset();
    toast.success.mockReset();
  });

  // #283: created from an agent's page, the tool is turned on for that agent.
  it("enables the new tool on the agent it was opened from and returns there", async () => {
    renderAt("/ws/tools/new?agent=bot-1");
    expect(api.prev).toBe("/ws/chatbot/bot-1");
    // Marketplace installs don't carry the agent, so the option is hidden.
    expect(screen.queryByText("Marketplace")).not.toBeInTheDocument();

    createHttpTool();

    await waitFor(() =>
      expect(api.handleSuccess).toHaveBeenCalledWith("/ws/chatbot/bot-1"),
    );
    // An empty body keeps destructive MCP actions off, like the add drawer.
    expect(api.enabled).toEqual([
      { chatbotId: "bot-1", toolId: "tool-1", body: {} },
    ]);
    expect(toast.success).toHaveBeenCalledWith(
      "Tool created and added to the agent.",
    );
  });

  it("shows the success step and enables nothing when opened from the tools list", async () => {
    renderAt("/ws/tools/new");
    expect(api.prev).toBe("/ws/tools");
    expect(screen.getByText("Marketplace")).toBeInTheDocument();

    createHttpTool();

    expect(await screen.findByText("success-step")).toBeInTheDocument();
    expect(api.enabled).toEqual([]);
    expect(api.handleSuccess).not.toHaveBeenCalled();
  });
});
