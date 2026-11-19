import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useDetailTab } from "./use-detail-tab";

const setup = (url: string) =>
  renderHook(
    () => {
      const [tab, open] = useDetailTab();
      return { tab, open, search: useLocation().search };
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      ),
    },
  );

describe("useDetailTab", () => {
  it("opens the tab the link names", () => {
    expect(setup("/bot?tab=knowledge").result.current.tab).toBe("knowledge");
  });

  it("falls back to the overview for an unknown tab", () => {
    expect(setup("/bot?tab=nope").result.current.tab).toBe("overview");
  });

  it("writes the opened tab to the link", () => {
    const { result } = setup("/bot");

    act(() => result.current.open("advanced"));

    expect(result.current.tab).toBe("advanced");
    expect(result.current.search).toBe("?tab=advanced");
  });

  it("keeps the link clean for the overview", () => {
    const { result } = setup("/bot?tab=knowledge");

    act(() => result.current.open("overview"));

    expect(result.current.tab).toBe("overview");
    expect(result.current.search).toBe("");
  });

  it("ignores an unknown tab", () => {
    const { result } = setup("/bot?tab=knowledge");

    act(() => result.current.open("nope"));

    expect(result.current.tab).toBe("knowledge");
    expect(result.current.search).toBe("?tab=knowledge");
  });
});
