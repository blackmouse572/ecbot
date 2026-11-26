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
      ],
      count: 1,
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
});
