import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  chatbots: [] as { id: string; name: string }[],
  link: vi.fn(),
  linkedFor: [] as string[],
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/hooks/api", () => ({
  useChatbots: () => ({
    chatbots: state.chatbots,
    isLoading: false,
    isError: false,
  }),
  useLinkChatbotAccount: (chatbotId: string) => {
    state.linkedFor.push(chatbotId);
    return { mutateAsync: state.link, isPending: false };
  },
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));
vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});

import { LinkAgentPanel } from "./link-agent-panel";

const page = {
  id: "acc-1",
  type: "FACEBOOK_PAGE",
  name: "Tiệm bánh Mây",
} as never;

const renderPanel = () =>
  render(
    <MemoryRouter>
      <LinkAgentPanel accounts={[page]} />
    </MemoryRouter>,
  );

describe("LinkAgentPanel", () => {
  beforeEach(() => {
    state.chatbots = [];
    state.linkedFor = [];
    state.link.mockReset();
    toast.error.mockReset();
  });

  it("links the new channel to the workspace's agent", async () => {
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    state.link.mockResolvedValue({ data: { data: { linked: ["acc-1"] } } });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Link agent" }));

    await waitFor(() =>
      expect(state.link).toHaveBeenCalledWith({ accounts: ["acc-1"] }),
    );
    expect(state.linkedFor).toContain("bot-1");
    expect(
      await screen.findByText(/Mây now answers on this channel/),
    ).toBeInTheDocument();
  });

  it("says so when the channel already has another agent", async () => {
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    state.link.mockResolvedValue({ data: { data: { linked: [] } } });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Link agent" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("offers to build an agent for the channel when the workspace has none", () => {
    renderPanel();

    expect(
      screen.queryByRole("button", { name: "Link agent" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create an agent for this channel" }),
    ).toHaveAttribute("href", "/kunmart/chatbot/create?accountId=acc-1");
  });

  it("shows nothing for a channel no agent can answer on", () => {
    const { container } = render(
      <MemoryRouter>
        <LinkAgentPanel
          accounts={[
            { id: "u-1", type: "FACEBOOK_ACCOUNT", name: "Lan" } as never,
          ]}
        />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
