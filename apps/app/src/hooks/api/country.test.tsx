import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

// 250 countries served 100 per page, the API's maximum page size.
const ALL = Array.from({ length: 250 }, (_, i) => ({
  id: `c${i}`,
  name: i === 0 ? "Vietnam" : `Country ${String(i).padStart(3, "0")}`,
}));

const list = vi.hoisted(() => vi.fn());
vi.mock("@repo/client", () => ({
  countrySharedControllerListPublicV1: list,
  countrySystemControllerListV1: vi.fn(),
}));

import { useAllCountriesShare } from "./country";

describe("useAllCountriesShare", () => {
  it("loads every page, not just the first 20 or 100, sorted by name", async () => {
    list.mockImplementation(
      async ({ query }: { query: { page: number; perPage: number } }) => ({
        data: {
          data: ALL.slice(
            (query.page - 1) * query.perPage,
            query.page * query.perPage,
          ),
          _metadata: {
            pagination: {
              total: 250,
              totalPage: Math.ceil(250 / query.perPage),
            },
          },
        },
      }),
    );
    const client = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAllCountriesShare(), { wrapper });

    await waitFor(() => expect(result.current.countries).toHaveLength(250));
    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls.map(([args]) => args.query.perPage)).toEqual([
      100, 100, 100,
    ]);
    const names = result.current.countries!.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names).toContain("Vietnam");
  });
});
