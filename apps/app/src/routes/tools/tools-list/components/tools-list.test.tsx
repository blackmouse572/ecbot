import "@/i18n";
import i18n from "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// SAFETY: the section only maps catalog rows into ToolkitCard props.
const catalog = vi.hoisted(() => ({
  catalog: [] as unknown[],
  isLoading: false,
  args: undefined as unknown,
}));

vi.mock("@/hooks/api/tools", () => ({
  useMarketplaceCatalog: (_ws: string, filters: unknown) => {
    catalog.args = filters;
    return catalog;
  },
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

import { ToolAddMenu } from "./tools-list-table/tool-add-menu";
import { ToolInUseCell } from "./tools-list-table/tool-in-use-cell";
import { ToolsPopularSection } from "./tools-popular-section";

const inRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ToolInUseCell", () => {
  it("counts the agents that use the tool", () => {
    inRouter(<ToolInUseCell count={3} />);
    expect(screen.getByText("Used by 3 agents")).toBeInTheDocument();
  });

  it("says when no agent uses it yet", () => {
    inRouter(<ToolInUseCell count={0} />);
    expect(screen.getByText("Not used yet")).toBeInTheDocument();
  });

  it("shows nothing before the count is known", () => {
    const { container } = inRouter(<ToolInUseCell count={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ToolAddMenu", () => {
  it("puts the store first, then the developer options", async () => {
    inRouter(<ToolAddMenu />);

    fireEvent.pointerDown(screen.getByRole("button", { name: /Add/ }), {
      button: 0,
      ctrlKey: false,
    });

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Choose from the app store",
      "Call an HTTP API",
      "Connect an MCP server",
    ]);
    expect(items.map((item) => item.getAttribute("href"))).toEqual([
      "/acme/tools/marketplace",
      "/acme/tools/new/http",
      "/acme/tools/new/mcp",
    ]);
  });
});

describe("ToolsPopularSection", () => {
  it("shows the first store apps and links to the whole store", () => {
    catalog.catalog = [
      { slug: "googlesheets", name: "Google Sheets" },
      { slug: "shopify", name: "Shopify" },
    ];
    inRouter(<ToolsPopularSection />);

    expect(catalog.args).toEqual({ page: 1, perPage: 6 });
    expect(screen.getByText("Google Sheets").closest("a")).toHaveAttribute(
      "href",
      "/acme/tools/marketplace/googlesheets",
    );
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute(
      "href",
      "/acme/tools/marketplace",
    );
  });

  it("hides itself when the store has nothing", () => {
    catalog.catalog = [];
    const { container } = inRouter(<ToolsPopularSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
