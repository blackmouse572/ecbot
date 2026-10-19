import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useAnalyticsParams } from "./use-analytics-params";

const setup = (url: string, allowed = ["bot", "customers"] as const) =>
  renderHook(() => useAnalyticsParams([...allowed]), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    ),
  });

describe("useAnalyticsParams", () => {
  it("reads the range and tab from the URL", () => {
    const { result } = setup("/?range=7d&tab=customers");
    expect(result.current.range).toBe("7d");
    expect(result.current.tab).toBe("customers");
  });

  it("falls back to 30 days and the first allowed tab", () => {
    // "conversion" is not allowed for this member.
    const { result } = setup("/?range=1y&tab=conversion");
    expect(result.current.range).toBe("30d");
    expect(result.current.tab).toBe("bot");
  });

  it("writes a new range and tab back to the URL", () => {
    const { result } = setup("/");
    act(() => result.current.setRange("90d"));
    act(() => result.current.setTab("customers"));
    expect(result.current.range).toBe("90d");
    expect(result.current.tab).toBe("customers");
  });
});
