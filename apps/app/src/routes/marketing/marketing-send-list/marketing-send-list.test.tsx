import "@/i18n";
import i18n from "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom has no Element.scroll; _DataTable calls it to reset scroll on page change.
Element.prototype.scroll = vi.fn();

const state = vi.hoisted(() => ({ params: [] as unknown[] }));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));

vi.mock("@/hooks/api/marketing-sends", () => ({
  useBatchSetMarketingSendsActive: () => ({ mutateAsync: vi.fn() }),
  useMarketingSends: (_workspace: string, params: unknown) => {
    state.params.push(params);
    return {
      sends: [
        {
          id: "s1",
          name: "Chào khách mới",
          mode: "AUTO",
          active: false,
          text: "",
          imageUrl: null,
          preset: "NEW",
          createdAt: "2026-11-01T09:00:00.000Z",
          stats: {
            queued: 0,
            sent: 8,
            failed: 0,
            skipped: 0,
            replied: 2,
            ordered: 1,
            revenue: 0,
            optedOut: 0,
            lastSentAt: null,
          },
        },
        {
          id: "s2",
          name: "Mời khách cũ quay lại",
          mode: "ONCE",
          active: true,
          text: "",
          imageUrl: null,
          preset: "WIN_BACK",
          createdAt: "2026-11-02T09:00:00.000Z",
          stats: {
            queued: 0,
            sent: 4,
            failed: 0,
            skipped: 0,
            replied: 0,
            ordered: 0,
            revenue: 0,
            optedOut: 0,
            lastSentAt: null,
          },
        },
      ],
      count: 2,
      isLoading: false,
      isError: false,
    };
  },
}));

import { MarketingSendList } from "./marketing-send-list";

const renderIt = () =>
  render(
    <HelmetProvider>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/lumi/marketing/sends"]}>
          <MarketingSendList />
        </MemoryRouter>
      </TooltipProvider>
    </HelmetProvider>,
  );

describe("MarketingSendList", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("vi");
  });

  beforeEach(() => {
    state.params = [];
  });

  it("lists each send with its status and reply rate", () => {
    renderIt();

    expect(screen.getByText("Chào khách mới")).toBeTruthy();
    expect(screen.getByText("Đã tắt tự gửi")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("filters by how a send goes out", async () => {
    renderIt();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Gửi 1 lần" }));

    await waitFor(() =>
      expect(state.params.at(-1)).toMatchObject({ mode: "ONCE", page: 1 }),
    );
  });

  it("lets only auto-sends be ticked for Tắt / Bật lại tự gửi", () => {
    renderIt();

    const boxes = screen.getAllByRole("checkbox");
    // The header box, then one per row in order.
    expect(boxes[1].hasAttribute("disabled")).toBe(false);
    expect(boxes[2].hasAttribute("disabled")).toBe(true);
  });

  it("offers only the action that fits the ticked sends", async () => {
    renderIt();

    // s1 is an auto-send that is already off.
    fireEvent.click(screen.getAllByRole("checkbox")[1]);

    expect(
      await screen.findByRole("button", { name: /Bật lại tự gửi/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Tắt tự gửi/ })).toBeNull();
  });
});
