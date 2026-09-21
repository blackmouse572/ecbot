import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseMediaQuery } = vi.hoisted(() => ({
  mockUseMediaQuery: vi.fn(),
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mockUseMediaQuery,
}));

import { useConversationSidebar } from "./use-conversation-sidebar";

describe("useConversationSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseMediaQuery.mockReset();
  });

  it("on desktop defaults open and persists the toggle across remounts", () => {
    mockUseMediaQuery.mockReturnValue(false); // not mobile

    const first = renderHook(() => useConversationSidebar());
    expect(first.result.current.open).toBe(true);

    act(() => first.result.current.toggle());
    expect(first.result.current.open).toBe(false);

    // A new mount (e.g. switching threads) remembers the closed choice.
    const second = renderHook(() => useConversationSidebar());
    expect(second.result.current.open).toBe(false);
  });

  it("on small screens defaults collapsed without touching the desktop preference", () => {
    // Desktop preference is open (default), but mobile should start collapsed.
    mockUseMediaQuery.mockReturnValue(true); // mobile

    const { result } = renderHook(() => useConversationSidebar());
    expect(result.current.open).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);

    // The persisted desktop preference is untouched by the mobile toggle.
    expect(
      localStorage.getItem("conversations.customerSidebarOpen"),
    ).toBeNull();
  });
});
