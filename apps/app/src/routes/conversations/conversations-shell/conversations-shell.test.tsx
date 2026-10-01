import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseMediaQuery } = vi.hoisted(() => ({
  mockUseMediaQuery: vi.fn(),
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mockUseMediaQuery,
}));
vi.mock("../conversation-list/conversation-list", () => ({
  ConversationList: () => <div>conversation-list</div>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ConversationsShell } from "./conversations-shell";

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/conversations" element={<ConversationsShell />}>
            <Route index element={<div>empty-state</div>} />
            <Route path=":id" element={<div>thread</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("ConversationsShell", () => {
  beforeEach(() => mockUseMediaQuery.mockReset());

  it("on small screens shows only the list when no conversation is open", () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderAt("/conversations");
    expect(screen.getByText("conversation-list")).toBeInTheDocument();
    expect(screen.queryByText("empty-state")).not.toBeInTheDocument();
  });

  it("on small screens shows only the thread once a conversation is open", () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderAt("/conversations/abc");
    expect(screen.getByText("thread")).toBeInTheDocument();
    expect(screen.queryByText("conversation-list")).not.toBeInTheDocument();
  });

  it("on desktop shows the list beside the thread", () => {
    mockUseMediaQuery.mockReturnValue(false);
    renderAt("/conversations/abc");
    expect(screen.getByText("thread")).toBeInTheDocument();
    expect(screen.getByText("conversation-list")).toBeInTheDocument();
  });
});
