import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseMediaQuery } = vi.hoisted(() => ({
  mockUseMediaQuery: vi.fn(),
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mockUseMediaQuery,
}));

import { useConversationSidebar } from "./use-conversation-sidebar";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, { initialEntries: ["/c/1"] }, children);

const useHarness = () => ({
  sidebar: useConversationSidebar(),
  location: useLocation(),
  navigate: useNavigate(),
});

describe("useConversationSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseMediaQuery.mockReset();
  });

  it("on desktop defaults open and persists the toggle across remounts", () => {
    mockUseMediaQuery.mockReturnValue(false); // not mobile

    const first = renderHook(() => useConversationSidebar(), { wrapper });
    expect(first.result.current.open).toBe(true);

    act(() => first.result.current.toggle());
    expect(first.result.current.open).toBe(false);

    // A new mount (e.g. switching threads) remembers the closed choice.
    const second = renderHook(() => useConversationSidebar(), { wrapper });
    expect(second.result.current.open).toBe(false);
  });

  it("on small screens opens the panel as its own history entry", () => {
    mockUseMediaQuery.mockReturnValue(true); // mobile

    const { result } = renderHook(useHarness, { wrapper });
    expect(result.current.sidebar.open).toBe(false);

    act(() => result.current.sidebar.toggle());
    expect(result.current.sidebar.open).toBe(true);
    expect(result.current.location.search).toBe("?panel=customer");

    // The phone's back gesture steps from the details back to the thread.
    act(() => result.current.navigate(-1));
    expect(result.current.sidebar.open).toBe(false);
    expect(result.current.location.pathname).toBe("/c/1");

    // The persisted desktop preference is untouched by the mobile toggle.
    expect(
      localStorage.getItem("conversations.customerSidebarOpen"),
    ).toBeNull();
  });

  it("on small screens closing the panel returns to the thread entry", () => {
    mockUseMediaQuery.mockReturnValue(true);

    const { result } = renderHook(useHarness, { wrapper });
    const threadKey = result.current.location.key;
    act(() => result.current.sidebar.toggle());
    act(() => result.current.sidebar.toggle());

    expect(result.current.sidebar.open).toBe(false);
    // Closing popped the details entry instead of pushing another thread
    // entry, so the next back leaves the thread.
    expect(result.current.location.key).toBe(threadKey);
  });
});
