import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
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

const state = vi.hoisted(() => ({
  empty: false,
  lastQuery: undefined as unknown,
}));

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
  useTrackedLinks: () => ({
    links: [{ id: "src-1", name: "Tờ rơi Tết" }],
  }),
}));

import { CustomerListTable } from "./customer-list-table";

const renderTable = (url = "/acme/customers") =>
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/:workspaceSlug/customers"
            element={<CustomerListTable />}
          />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );

describe("CustomerListTable", () => {
  afterEach(() => {
    state.empty = false;
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

  it("says so when there are no customers yet", () => {
    state.empty = true;
    renderTable();

    expect(screen.getByText("No customers yet")).toBeInTheDocument();
  });
});
