import { TooltipProvider } from "@medusajs/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

type G = typeof globalThis & { ResizeObserver: typeof ResizeObserverMock };

(globalThis as G).ResizeObserver =
  (globalThis as G).ResizeObserver ?? ResizeObserverMock;

if (!HTMLElement.prototype.scroll) {
  HTMLElement.prototype.scroll = () => {};
}

// cmdk scrolls the active item into view; jsdom does not implement it.
Element.prototype.scrollIntoView = vi.fn();

// jsdom has no layout, so the real virtualizer measures zero rows.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 32,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        size: 32,
        start: index * 32,
      })),
  }),
}));

const state = vi.hoisted(() => ({
  empty: false,
  lastQuery: undefined as unknown,
  sourceSearches: [] as Array<string | undefined>,
}));

const tet = { id: "src-1", name: "Tờ rơi Tết", code: "tet" };
// Past the first page of sources, found by its code.
const fair = { id: "src-9", name: "Hội chợ", code: "hc26" };

const customers = [
  {
    id: "c-1",
    name: "Lan Anh",
    phone: "0909 123 456",
    email: "lan@example.com",
    createdAt: "2026-09-20T08:00:00Z",
    marketing: {
      stage: "ASKED_PRICE",
      permission: "PENDING",
      permissionUntil: null,
      hostile: false,
      dormant: false,
      firstSource: {
        sourceId: "src-1",
        sourceName: "Tờ rơi Tết",
        codeName: "KOL Minh Thư",
        channel: "FACEBOOK_PAGE",
        at: "2026-09-20T08:00:00Z",
      },
    },
  },
  {
    id: "c-2",
    name: null,
    phone: null,
    email: null,
    createdAt: "2026-09-21T08:00:00Z",
    marketing: {
      stage: "BOUGHT_ONCE",
      permission: "STOPPED",
      permissionUntil: null,
      hostile: true,
      dormant: true,
      firstSource: null,
    },
  },
];

vi.mock("@/hooks/api", () => ({
  useCustomers: (query: unknown) => {
    state.lastQuery = query;

    return {
      customers: state.empty ? [] : customers,
      count: state.empty ? 0 : customers.length,
      isLoading: false,
      isError: false,
      error: null,
    };
  },
}));

vi.mock("@/hooks/api/tracked-links", () => ({
  trackedLinkListQueryOptions: (
    workspace: string,
    params: { search?: string },
  ) => ({
    queryKey: ["tracked-links", workspace, params],
    queryFn: () => {
      state.sourceSearches.push(params.search);

      return Promise.resolve({
        data: params.search === fair.code ? [fair] : [tet],
      });
    },
  }),
  useTrackedLink: (_workspace: string, id: string) => ({
    link: id === fair.id ? fair : undefined,
  }),
}));

import { CustomerListTable } from "./customer-list-table";

const renderTable = (url = "/acme/customers") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route
              path="/:workspaceSlug/customers"
              element={<CustomerListTable />}
            />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );

describe("CustomerListTable", () => {
  afterEach(() => {
    state.empty = false;
    state.sourceSearches = [];
  });

  it("lists the customers the bot collected, with their contact details", () => {
    renderTable();

    expect(screen.getByText("Lan Anh")).toBeInTheDocument();
    expect(screen.getByText("0909 123 456")).toBeInTheDocument();
    expect(screen.getByText("lan@example.com")).toBeInTheDocument();
    expect(screen.getByText("Unnamed customer")).toBeInTheDocument();
  });

  it("searches with the query in the URL, a page at a time", () => {
    renderTable("/acme/customers?search=lan&page=2");

    expect(state.lastQuery).toMatchObject({
      search: "lan",
      page: 2,
      perPage: 20,
    });
  });

  it("shows each customer's stage and offers permission", () => {
    renderTable();

    expect(screen.getByText("Asked price")).toBeInTheDocument();
    expect(screen.getByText("Not agreed yet")).toBeInTheDocument();
    // Inactive shows over the stage; stopped and upset are loud.
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Stopped for good")).toBeInTheDocument();
    expect(screen.getByText("Upset")).toBeInTheDocument();
  });

  it("filters by stage, permission and dormant from the URL", () => {
    renderTable(
      "/acme/customers?stage=NEW,ASKED_PRICE&permission=GRANTED&dormant=false",
    );

    expect(state.lastQuery).toMatchObject({
      stage: "NEW,ASKED_PRICE",
      permission: "GRANTED",
      dormant: false,
    });
  });

  it("shows where each customer first came from", () => {
    renderTable();

    expect(screen.getByText("Tờ rơi Tết, KOL Minh Thư")).toBeInTheDocument();
    expect(screen.getByText("Messaged the page directly")).toBeInTheDocument();
  });

  it("filters by first source from the URL", () => {
    renderTable("/acme/customers?source=src-1");

    expect(state.lastQuery).toMatchObject({ source: "src-1" });
  });

  it("searches every source on the server from the Nguồn picker", async () => {
    renderTable("/acme/customers?source=src-1");

    await userEvent.click(await screen.findByText("Tờ rơi Tết"));
    // Hidden to queries: jsdom has no layout, so Radix sees it detached.
    const picker = await screen.findByRole("dialog", { hidden: true });
    await userEvent.type(within(picker).getByPlaceholderText("Search"), "hc26");

    // The name does not contain the code, so only the server could match it.
    expect(await screen.findByText("Hội chợ")).toBeInTheDocument();
    expect(state.sourceSearches).toContain("hc26");
  });

  it("names a picked source that is not on the first page", async () => {
    renderTable("/acme/customers?source=src-9");

    await waitFor(() => expect(state.sourceSearches).toEqual([undefined]));
    expect(screen.getByText("Hội chợ")).toBeInTheDocument();
  });

  it("says so when there are no customers yet", () => {
    state.empty = true;
    renderTable();

    expect(screen.getByText("No customers yet")).toBeInTheDocument();
  });
});
