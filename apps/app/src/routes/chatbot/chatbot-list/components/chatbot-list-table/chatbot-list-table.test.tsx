import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

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

const chatbots = [
  { id: "a", name: "Alpha", status: "active", type: "beauty" },
  { id: "b", name: "Beta", status: "inactive", type: "fashion" },
];

vi.mock("@/hooks/api", () => ({
  useChatbots: () => ({
    chatbots,
    count: chatbots.length,
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

describe("ChatbotListTable", () => {
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
});
