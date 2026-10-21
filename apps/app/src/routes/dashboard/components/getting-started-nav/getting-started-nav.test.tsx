import "@/i18n";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  chatbots: 0,
  active: 0,
  accounts: [] as { type?: string; chatbot: { id: string } | null }[],
  conversations: 0,
}));
const query = (count: number) => ({ count, isLoading: false, isError: false });

vi.mock("@/hooks/api/chatbot", () => ({
  useChatbots: (q: { status?: string[] }) =>
    query(q?.status ? data.active : data.chatbots),
}));
vi.mock("@/hooks/api/accounts", () => ({
  useAccounts: () => ({
    ...query(data.accounts.length),
    accounts: data.accounts,
  }),
}));
vi.mock("@/hooks/api/conversations", () => ({
  useConversations: () => query(data.conversations),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));
vi.mock("@repo/auth", () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { GettingStartedNav } from "./getting-started-nav";

const renderNav = (path = "/kunmart/conversations") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <GettingStartedNav />
    </MemoryRouter>,
  );

describe("GettingStartedNav", () => {
  beforeEach(() => {
    data.chatbots = 0;
    data.active = 0;
    data.accounts = [];
    data.conversations = 0;
  });

  it("shows progress and links every step still to do", () => {
    data.chatbots = 1;
    renderNav();

    expect(screen.getByText("1 of 5")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Create your first agent/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Connect a channel/ }),
    ).toHaveAttribute("href", "/kunmart/accounts/create");
    expect(
      screen.getByRole("link", { name: /Connect your agent to the channel/ }),
    ).toHaveAttribute("href", "/kunmart/accounts");
    expect(
      screen.getByRole("link", { name: /Activate your agent/ }),
    ).toHaveAttribute("href", "/kunmart/chatbot");
    expect(
      screen.getByRole("link", { name: /first conversation/i }),
    ).toHaveAttribute("href", "/kunmart/conversations");
  });

  it("fills the progress bar by the share of steps done", () => {
    data.chatbots = 1;
    data.active = 1;
    renderNav();

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
  });

  it("checks the channel once connected, and the link step once an agent answers on it", () => {
    data.chatbots = 1;
    data.accounts = [{ chatbot: null }];
    renderNav();

    // Connected but not linked: only linking is still to do.
    expect(
      screen.queryByRole("link", { name: /Connect a channel/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Connect your agent to the channel/ }),
    ).toHaveAttribute("href", "/kunmart/accounts");
  });

  it("ignores a Facebook login with no pages, which is not a channel", () => {
    data.chatbots = 1;
    data.accounts = [{ type: "FACEBOOK_ACCOUNT", chatbot: null }];
    renderNav();

    expect(
      screen.getByRole("link", { name: /Connect a channel/ }),
    ).toHaveAttribute("href", "/kunmart/accounts/create");
  });

  it("counts an agent as live only once it is active", () => {
    data.chatbots = 1;
    data.accounts = [{ chatbot: { id: "bot-1" } }];
    renderNav();

    expect(screen.getByText("3 of 5")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Activate your agent/ }),
    ).toBeInTheDocument();
  });

  it("stays out of the dashboard, which shows the full checklist card", () => {
    const { container } = renderNav("/kunmart/dashboard");

    expect(container).toBeEmptyDOMElement();
  });

  it("disappears once every step is done", () => {
    data.chatbots = 1;
    data.active = 1;
    data.accounts = [{ chatbot: { id: "bot-1" } }];
    data.conversations = 2;
    const { container } = renderNav();

    expect(container).toBeEmptyDOMElement();
  });
});
