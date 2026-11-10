import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavAccessProvider, type NavAbility } from "@repo/ui/layout";
import { Provider as JotaiProvider } from "jotai";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { CommandPalette } from "./command-palette";
import { normalizeSearch } from "./utils";

vi.mock("../main-layout/use-core-routes", () => ({
  useCoreRoutes: () => [
    {
      label: "Customers",
      to: "/acme/customers",
      ability: { action: "manage", subject: "CUSTOMER" },
    },
    { label: "Agents", to: "/acme/chatbot" },
  ],
}));
vi.mock("../main-layout/use-marketing-routes", () => ({
  useMarketingRoutes: () => [],
}));
vi.mock("@/hooks/api/chatbot", () => ({
  useChatbots: (query: { search?: string }, options: { enabled: boolean }) => {
    if (!options.enabled) return { chatbots: [], isFetching: false };
    return query.search
      ? { chatbots: [{ id: "bot-2", name: "Bún bò bot" }], isFetching: false }
      : { chatbots: [{ id: "bot-1", name: "Recent bot" }], isFetching: false };
  },
}));
vi.mock("@/hooks/api/customers", () => ({
  useCustomers: () => ({ customers: [], isFetching: false }),
}));
vi.mock("@/hooks/api/knowledge-base", () => ({
  useKnowledgeBases: () => ({ knowledgeBases: [{ id: "kb-1" }] }),
  useKnowledgeItems: () => ({ items: [], isFetching: false }),
}));
vi.mock("@/hooks/api/skills", () => ({
  useListSkills: () => ({ skills: [], isFetching: false }),
}));
vi.mock("@/hooks/api/tools", () => ({
  useListTools: () => ({ tools: [], isFetching: false }),
}));

const Location = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const renderPalette = (can: (ability: NavAbility) => boolean = () => true) =>
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <JotaiProvider>
          <NavAccessProvider can={can}>
            <MemoryRouter initialEntries={["/acme/dashboard"]}>
              <Routes>
                <Route
                  path="/:workspaceSlug/*"
                  element={
                    <>
                      <CommandPalette />
                      <Location />
                    </>
                  }
                />
              </Routes>
            </MemoryRouter>
          </NavAccessProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );

const pressCtrlK = () => fireEvent.keyDown(window, { key: "k", ctrlKey: true });

describe("CommandPalette", () => {
  beforeEach(async () => {
    // cmdk scrolls the selected row into view; jsdom has no layout.
    Element.prototype.scrollIntoView = vi.fn();
    await i18n.changeLanguage("en");
  });

  it("opens on Ctrl+K with pages, recent agents and quick actions", async () => {
    renderPalette();
    expect(screen.queryByRole("dialog")).toBeNull();

    pressCtrlK();

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Go to")).toBeTruthy();
    expect(screen.getByText("Customers")).toBeTruthy();
    expect(screen.getByText("Recent bot")).toBeTruthy();
    expect(screen.getByText("Create agent")).toBeTruthy();
  });

  it("hides pages the member may not open", async () => {
    renderPalette((ability) => ability.subject !== "CUSTOMER");
    pressCtrlK();

    await screen.findByRole("dialog");
    expect(screen.queryByText("Customers")).toBeNull();
    expect(screen.getByText("Agents")).toBeTruthy();
  });

  it("lists workspace settings, API keys and account settings for a member with no abilities", async () => {
    renderPalette(() => false);
    pressCtrlK();

    await screen.findByRole("dialog");
    expect(screen.getAllByText("Workspace settings").length).toBeGreaterThan(0);
    expect(screen.getByText("API keys")).toBeTruthy();
    expect(screen.getByText("Account settings")).toBeTruthy();
  });

  it("searches agents on the server and opens the one picked", async () => {
    renderPalette();
    pressCtrlK();

    await userEvent.type(await screen.findByRole("combobox"), "bun");
    await userEvent.click(await screen.findByText("Bún bò bot"));

    expect(screen.getByTestId("location").textContent).toBe(
      "/acme/chatbot/bot-2",
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("normalizeSearch", () => {
  it("matches Vietnamese text typed without accents", () => {
    expect(normalizeSearch("Khách hàng Đà Nẵng")).toContain(
      normalizeSearch("khach hang da nang"),
    );
  });
});
