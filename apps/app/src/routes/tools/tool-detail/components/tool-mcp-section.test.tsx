import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rediscover = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/api/tools", () => ({
  useRediscoverTool: () => ({ rediscover, isPending: false }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));
vi.mock("@medusajs/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@medusajs/ui")>()),
  toast: { error: toastError, success: vi.fn() },
}));

import { ToolMcpSection } from "./tool-mcp-section";

const tool = {
  id: "t-1",
  kind: "MCP",
  mcpProvider: "OPERATOR",
  mcpServerUrl: "https://mcp.example.com/sse",
  discoveredActions: [],
} as never;

// #175: the server URL was shown nowhere, and a failed reload said nothing
// useful.
describe("ToolMcpSection", () => {
  beforeEach(() => {
    rediscover.mockReset();
    toastError.mockReset();
  });

  it("shows the MCP server URL", () => {
    render(<ToolMcpSection item={tool} />);

    expect(screen.getByText("https://mcp.example.com/sse")).toBeTruthy();
  });

  it("shows the server's reason when a reload fails", async () => {
    rediscover.mockRejectedValue({
      response: {
        status: 502,
        data: { message: "Could not connect to the MCP server." },
      },
    });
    render(<ToolMcpSection item={tool} />);

    fireEvent.click(screen.getByRole("button", { name: /reload/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Could not connect to the MCP server.",
      ),
    );
  });
});
