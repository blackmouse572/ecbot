import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const { conversion, marketing, bot, customers } = vi.hoisted(() => ({
  conversion: vi.fn(),
  marketing: vi.fn(),
  bot: vi.fn(),
  customers: vi.fn(),
}));

vi.mock("@repo/client", () => ({
  analyticsWorkspaceControllerConversionV1: conversion,
  analyticsWorkspaceControllerMarketingV1: marketing,
  analyticsWorkspaceControllerBotV1: bot,
  analyticsWorkspaceControllerCustomersV1: customers,
}));

vi.mock("../use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "w" }),
}));

import { useWorkspaceAnalytics } from "./workspace-analytics";

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    children,
  );

describe("useWorkspaceAnalytics", () => {
  it("fetches only the sections of the tabs the member may see", async () => {
    conversion.mockResolvedValue({
      data: { data: { generatedAt: "2026-10-19T03:00:00Z" } },
    });
    bot.mockResolvedValue({
      data: { data: { generatedAt: "2026-10-19T02:00:00Z" } },
    });

    const { result } = renderHook(
      () => useWorkspaceAnalytics("7d", ["conversion", "bot"]),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.conversion?.generatedAt).toBe(
      "2026-10-19T03:00:00Z",
    );
    expect(result.current.data.marketing).toBeUndefined();
    expect(marketing).not.toHaveBeenCalled();
    expect(customers).not.toHaveBeenCalled();
    // The oldest section decides when the page was last updated.
    expect(result.current.generatedAt).toBe("2026-10-19T02:00:00Z");
    expect(conversion).toHaveBeenCalledWith({
      path: { workspace: "w" },
      query: {
        range: "7d",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  });
});
