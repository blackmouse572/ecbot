import "@/i18n";
import i18n from "@/i18n";
import type { MarketingSendGetResponseDto } from "@/hooks/api/marketing-sends";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  // SAFETY: beforeEach sets a send before every render.
  send: undefined as unknown as MarketingSendGetResponseDto,
  update: vi.fn(),
  prompt: vi.fn(),
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "lumi" }),
}));

vi.mock("@/hooks/api/marketing-sends", () => ({
  useMarketingSend: () => ({
    send: state.send,
    isLoading: false,
    isError: false,
  }),
  useUpdateMarketingSend: () => ({
    mutateAsync: state.update,
    isPending: false,
  }),
  useMarketingSendReplies: () => ({
    replies: [
      {
        customerId: "c1",
        name: "Lan",
        conversationId: "conv-1",
        text: "Còn size M không shop?",
        repliedAt: "2026-11-20T09:00:00.000Z",
        status: "WAITING",
      },
      {
        customerId: "c2",
        name: null,
        conversationId: null,
        text: null,
        repliedAt: "2026-11-20T10:00:00.000Z",
        status: "ORDERED",
      },
    ],
    count: 2,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@medusajs/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/ui")>();
  return { ...actual, usePrompt: () => state.prompt };
});

vi.mock("@repo/ui/layout", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    TwoColumnPage: Object.assign(Pass, { Main: Pass, Sidebar: Pass }),
  };
});

import { MarketingSendDetail } from "./marketing-send-detail";

const send = (
  overrides: Partial<MarketingSendGetResponseDto> = {},
): MarketingSendGetResponseDto => ({
  id: "send-1",
  name: "Chào khách mới",
  mode: "AUTO",
  active: true,
  text: "Chào {name}, shop tặng bạn mã giảm 10%.",
  imageUrl: null,
  preset: "NEW",
  createdAt: "2026-11-01T09:00:00.000Z",
  stats: {
    queued: 0,
    sent: 40,
    failed: 0,
    skipped: 3,
    replied: 10,
    ordered: 4,
    revenue: 1200000,
    optedOut: 1,
    lastSentAt: "2026-11-20T09:00:00.000Z",
  },
  channels: [
    { channel: "FACEBOOK_PAGE", sent: 30, replied: 8, ordered: 3, optedOut: 1 },
  ],
  notSent: [{ reason: "CAPPED", count: 3 }],
  ...overrides,
});

const renderIt = () =>
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={["/lumi/marketing/sends/send-1"]}>
        <Routes>
          <Route
            path="/:workspaceSlug/marketing/sends/:sendId"
            element={<MarketingSendDetail />}
          />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );

describe("MarketingSendDetail", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("vi");
  });

  beforeEach(() => {
    state.send = send();
    state.update.mockReset().mockResolvedValue({});
    state.prompt.mockReset().mockResolvedValue(true);
  });

  it("shows the send's results, replies, channels and who it missed", () => {
    renderIt();

    expect(
      screen.getByRole("heading", { name: "Chào khách mới" }),
    ).toBeTruthy();
    expect(screen.getByText("Đang tự gửi")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("Lan").closest("a")?.getAttribute("href")).toBe(
      "/lumi/conversations/conv-1",
    );
    // No name and no conversation: a plain row.
    expect(screen.getByText("Khách").closest("a")).toBeNull();
    expect(screen.getByText("Facebook")).toBeTruthy();
    expect(screen.getByText("{Tên khách}")).toBeTruthy();
    expect(screen.getByText("3 khách")).toBeTruthy();
  });

  it("asks before turning auto-send off", async () => {
    renderIt();

    fireEvent.click(screen.getByRole("button", { name: /Tắt tự gửi/ }));

    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith({ active: false }),
    );
    expect(state.prompt).toHaveBeenCalledOnce();
  });

  it("keeps it on when the shop cancels", async () => {
    state.prompt.mockResolvedValue(false);
    renderIt();

    fireEvent.click(screen.getByRole("button", { name: /Tắt tự gửi/ }));

    await waitFor(() => expect(state.prompt).toHaveBeenCalled());
    expect(state.update).not.toHaveBeenCalled();
  });

  it("turns a stopped auto-send back on without asking", async () => {
    state.send = send({ active: false });
    renderIt();

    fireEvent.click(screen.getByRole("button", { name: /Bật lại tự gửi/ }));

    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith({ active: true }),
    );
    expect(state.prompt).not.toHaveBeenCalled();
  });

  it("offers nothing to change on a one-off send that has gone out", () => {
    state.send = send({ mode: "ONCE" });
    renderIt();

    expect(screen.queryByRole("button", { name: /Tắt tự gửi/ })).toBeNull();
    expect(screen.queryByText("Sửa tin nhắn")).toBeNull();
  });

  it("lets the shop fix a one-off send's text while some still wait", () => {
    state.send = send({ mode: "ONCE", stats: { ...send().stats, queued: 5 } });
    renderIt();

    expect(screen.getByText("Sửa tin nhắn")).toBeTruthy();
    expect(screen.getByText("5 tin đang chờ gửi")).toBeTruthy();
  });
});
