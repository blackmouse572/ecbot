import { TooltipProvider } from "@medusajs/ui";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import "@/i18n";
import i18n from "@/i18n";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
type G = typeof globalThis & { ResizeObserver: typeof ResizeObserverMock };
(globalThis as G).ResizeObserver =
  (globalThis as G).ResizeObserver ?? ResizeObserverMock;

const stage = (s: string, current: number, previous: number) => ({
  stage: s,
  current,
  previous,
});
const overview = {
  total: 10,
  days: 30,
  since: "2026-11-13T00:00:00.000Z",
  stages: [
    stage("NEW", 4, 3),
    stage("INTERESTED", 2, 2),
    stage("ASKED_PRICE", 2, 1),
    stage("BOUGHT_ONCE", 1, 1),
    stage("BOUGHT_REPEAT", 1, 0),
  ],
  dormant: 3,
  funnel: [],
  moves: [{ from: "ASKED_PRICE", to: "BOUGHT_ONCE", count: 2 }],
  todos: [
    { key: "NEW", count: 1, excluded: 0 },
    { key: "INTERESTED", count: 0, excluded: 0 },
    { key: "ASKED_PRICE", count: 48, excluded: 6 },
    { key: "CROSS_SELL", count: 0, excluded: 0 },
    { key: "REPURCHASE", count: 0, excluded: 0 },
    { key: "WIN_BACK", count: 0, excluded: 0 },
  ],
  todoTotal: { count: 49, excluded: 6 },
  health: { optOuts: 1, optOutsPrevious: 0, paused: 2 },
} as unknown as MarketingOverviewResponseDto;

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));
const useMarketingOverview = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/api/marketing-overview", () => ({ useMarketingOverview }));
useMarketingOverview.mockImplementation(() => ({
  overview,
  isLoading: false,
  isError: false,
  error: null,
}));

import { MarketingOverview } from "./marketing-overview";

const renderPage = (url = "/") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <TooltipProvider>
          <MarketingOverview />
        </TooltipProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("MarketingOverview", () => {
  beforeAll(() => i18n.changeLanguage("vi"));

  it("shows each Việc nên làm row with its count and who was left out", () => {
    renderPage();

    const price = within(screen.getByTestId("todo-ASKED_PRICE"));
    expect(
      price.getByText("48 khách hỏi giá 7 ngày qua nhưng chưa mua"),
    ).toBeTruthy();
    expect(price.getByText(/Đã bỏ 6 khách không nên nhắn/)).toBeTruthy();
    expect(
      within(screen.getByTestId("todo-INTERESTED")).getByText(
        "Chưa có khách nào cần nhắn ở giai đoạn này.",
      ),
    ).toBeTruthy();
    // The Lâu không nhắn row counts the dormant customers.
    expect(
      within(screen.getByTestId("todo-WIN_BACK")).getByText("3 khách"),
    ).toBeTruthy();
  });

  it("opens the customer list filtered by the stage a card or move is about", () => {
    renderPage();

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/lumi/customers?stage=ASKED_PRICE");
    expect(hrefs).toContain("/lumi/customers?dormant=true");
    expect(
      screen.getByRole("link", { name: "Xem khách" }).getAttribute("href"),
    ).toBe("/lumi/customers?stage=BOUGHT_ONCE");
  });

  it("loads the range from the link, last 7 days by default", () => {
    renderPage();
    expect(useMarketingOverview).toHaveBeenLastCalledWith("lumi", "7d");

    renderPage("/?range=30d");
    expect(useMarketingOverview).toHaveBeenLastCalledWith("lumi", "30d");
  });

  it("words the comparisons by the range the numbers cover", () => {
    renderPage("/?range=30d");

    expect(
      screen.getAllByText("30 ngày qua, so với 30 ngày trước").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Khách chuyển giai đoạn trong 30 ngày qua"),
    ).toBeTruthy();
  });
});
