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

const data = vi.hoisted(() => ({ empty: false }));

const chatbots = [
  { id: "a", name: "Alpha", status: "active", type: "beauty" },
  { id: "b", name: "Beta", status: "inactive", type: "fashion" },
  { id: "c", name: "Gamma", status: "active", type: "hotel" },
  { id: "d", name: "Delta", status: "active", type: "not_a_real_type" },
];

vi.mock("@/hooks/api", () => ({
  useChatbots: () => ({
    chatbots: data.empty ? [] : chatbots,
    count: data.empty ? 0 : chatbots.length,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useBatchDeleteChatbots: () => ({ mutateAsync: vi.fn() }),
  useBatchToggleChatbotActive: () => ({ mutateAsync: vi.fn() }),
  useDeleteChatbot: () => ({ mutateAsync: vi.fn() }),
  useAccounts: () => ({ accounts: [], count: 0, isLoading: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useLoaderData: () => undefined };
});

import { ChatbotListTable } from "./chatbot-list-table";

const renderTable = () =>
  render(
    <MemoryRouter initialEntries={["/acme/chatbot"]}>
      <Routes>
        <Route path="/:workspaceSlug/chatbot" element={<ChatbotListTable />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ChatbotListTable", () => {
  afterEach(() => {
    data.empty = false;
  });

  it("offers a create button in the empty state", () => {
    data.empty = true;
    renderTable();

    expect(screen.getByText("No agents yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create agent" })).toHaveAttribute(
      "href",
      "/acme/chatbot/create",
    );
  });

  it("renders a select checkbox in the header and in every row", () => {
    render(
      <MemoryRouter initialEntries={["/acme/chatbot"]}>
        <Routes>
          <Route
            path="/:workspaceSlug/chatbot"
            element={<ChatbotListTable />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Alpha")).toBeDefined();

    const checkboxes = screen.queryAllByRole("checkbox");
    expect(checkboxes.length).toBe(chatbots.length + 1);
  });

  it("renders rows for a new business type and an unknown type", () => {
    render(
      <MemoryRouter initialEntries={["/acme/chatbot"]}>
        <Routes>
          <Route
            path="/:workspaceSlug/chatbot"
            element={<ChatbotListTable />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Gamma")).toBeDefined();
    expect(screen.getByText("Delta")).toBeDefined();
  });
});
