import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  chatbots: [] as { id: string; name: string; type?: string }[],
  owner: undefined as { id: string; name: string } | undefined,
  query: undefined as unknown,
  link: vi.fn(),
  linkedFor: [] as string[],
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/hooks/api", () => ({
  useChatbots: (query: unknown) => {
    state.query = query;
    return { chatbots: state.chatbots, isLoading: false, isError: false };
  },
  useAccountChatbot: () => ({
    chatbot: state.owner,
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/hooks/api/chatbot", () => ({
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

import { LinkAgentStep } from "./link-agent-step";

const page = {
  id: "acc-1",
  type: "FACEBOOK_PAGE",
  name: "Tiệm bánh Mây",
} as never;

const renderStep = (accounts = [page], onDone = vi.fn()) =>
  render(
    <MemoryRouter>
      <LinkAgentStep accounts={accounts} onDone={onDone} />
    </MemoryRouter>,
  );

describe("LinkAgentStep", () => {
  beforeEach(() => {
    state.chatbots = [];
    state.owner = undefined;
    state.linkedFor = [];
    state.link.mockReset();
    toast.error.mockReset();
    toast.success.mockReset();
  });

  it("asks for the five newest agents that can answer", () => {
    renderStep();

    expect(state.query).toMatchObject({
      perPage: 5,
      orderBy: "createdAt",
      orderDirection: "DESC",
      status: "active,inactive",
    });
    expect(screen.getByText("Connect to an agent")).toBeInTheDocument();
    expect(
      screen.getByText("Choose one agent to connect to this account."),
    ).toBeInTheDocument();
  });

  it("connects the channel to the picked agent, then offers only Complete", async () => {
    state.chatbots = [
      { id: "bot-1", name: "Mây" },
      { id: "bot-2", name: "Gió" },
    ];
    state.link.mockResolvedValue({ data: { data: { linked: ["acc-1"] } } });
    renderStep();

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() =>
      expect(state.link).toHaveBeenCalledWith({ accounts: ["acc-1"] }),
    );
    expect(state.linkedFor).toContain("bot-1");
    expect(await screen.findByText(/Connected to Mây/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Connect" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Complete" }),
    ).toBeInTheDocument();
  });

  it("links every new page of a Facebook login at once", async () => {
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    state.link.mockResolvedValue({
      data: { data: { linked: ["acc-1", "acc-2"] } },
    });
    renderStep([
      page,
      { id: "acc-2", type: "FACEBOOK_PAGE", name: "Gió" } as never,
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(state.link).toHaveBeenCalledWith({
        accounts: ["acc-1", "acc-2"],
      }),
    );
    expect(await screen.findByText(/Connected to Mây/)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalled();
  });

  it("names a page another agent kept when only some pages link", async () => {
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    state.link.mockResolvedValue({
      data: {
        data: { linked: ["acc-1"], skipped: [{ id: "acc-2", name: "Gió" }] },
      },
    });
    renderStep([
      page,
      { id: "acc-2", type: "FACEBOOK_PAGE", name: "Gió" } as never,
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Gió is already used by another agent"),
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("says so when the channel already has another agent", async () => {
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    state.link.mockResolvedValue({
      data: { data: { linked: [], skipped: [{ id: "acc-1", name: "Mây" }] } },
    });
    renderStep();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("shows the agent a reconnected channel already has", () => {
    state.owner = { id: "bot-9", name: "Linh" };
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    renderStep();

    expect(screen.getByText(/Connected to Linh/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Connect" }),
    ).not.toBeInTheDocument();
  });

  it("does not call several new pages linked because the first one is", () => {
    state.owner = { id: "bot-9", name: "Linh" };
    state.chatbots = [{ id: "bot-1", name: "Mây" }];
    renderStep([
      page,
      { id: "acc-2", type: "FACEBOOK_PAGE", name: "Gió" } as never,
    ]);

    expect(screen.queryByText(/Connected to Linh/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("offers to build an agent for the channel when the workspace has none", () => {
    renderStep();

    expect(screen.getByRole("link", { name: /Create agent/ })).toHaveAttribute(
      "href",
      "/kunmart/chatbot/create?accountId=acc-1",
    );
  });

  it("closes the dialog on Complete, linked or not", () => {
    const onDone = vi.fn();
    renderStep([page], onDone);

    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    expect(onDone).toHaveBeenCalled();
  });
});
