import { createProfile } from "@repo/agent-blueprint";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentBuilder } from "./agent-builder";

const create = vi.fn();
const update = vi.fn();
const suggest = vi.fn();
const chatbot = vi.fn();
const activate = vi.fn();
const toastError = vi.fn();

// `to-chatbot-payload.ts` pulls in `../../constants`, which imports `@/i18n`
// and initializes it with the real translation resources. Mocking
// `react-i18next` here (the same pattern used across the app's other tests,
// e.g. `routes/profile/sessions/sessions.test.tsx`) keeps `t()` returning
// raw keys so assertions can target them directly.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/hooks/api", () => ({
  useCreateChatbot: () => ({ mutateAsync: create }),
  useUpdateChatbot: () => ({ mutateAsync: update }),
  useToggleChatbotActivate: () => ({ mutateAsync: activate, isPending: false }),
  useChatbot: (...args: unknown[]) => chatbot(...args),
}));
vi.mock("@medusajs/ui", async () => {
  const actual = await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast: { ...actual.toast, error: (...args: unknown[]) => toastError(...args) } };
});
vi.mock("@/hooks/api/agent-builder", () => ({
  useAgentBuilderSuggest: () => ({ mutateAsync: suggest, isPending: false }),
}));
vi.mock("./components/test-panel", () => ({
  TestPanel: ({ chatbotId }: { chatbotId: string | null }) => <div data-testid="test-panel">{chatbotId ?? "locked"}</div>,
}));
vi.mock("@/components/modals", () => ({
  RouteFocusModal: { Header: ({ children }: never) => <div>{children}</div>, Body: ({ children }: never) => <div>{children}</div> },
}));

const renderBuilder = () => render(<MemoryRouter initialEntries={["/ws/chatbot/create"]}><AgentBuilder /></MemoryRouter>);

// Answers the open question with whatever makes it valid, then clicks Next.
async function answerCurrent() {
  const text = screen.queryByRole("textbox", { name: /agentBuilder\.(questions|facts)/ });
  if (text && !(text as HTMLInputElement).value) await userEvent.type(text, "Lotus");
  await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
}

describe("AgentBuilder", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ data: { data: { id: "bot-1" } } });
    update.mockReset().mockResolvedValue({});
    suggest.mockReset();
    chatbot.mockReset().mockReturnValue({ chatbot: undefined });
    activate.mockReset().mockResolvedValue({});
    toastError.mockReset();
  });

  it("starts from a template and asks the first question", async () => {
    renderBuilder();
    await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
    expect(screen.getByText("agentBuilder.groups.identity")).toBeInTheDocument();
  });

  it("shows the suggestion badge after describing the business", async () => {
    suggest.mockResolvedValue({ businessType: { value: "beauty", confidence: 0.95 }, personality: null, formality: null, goals: {}, rules: {} });
    renderBuilder();
    await userEvent.type(screen.getByPlaceholderText("agentBuilder.ui.startPlaceholder"), "Nail spa in Da Nang{enter}");
    await screen.findByText("agentBuilder.ui.auto");
    expect(screen.getByText("agentBuilder.ui.suggested")).toBeInTheDocument();
  });

  it("keeps going with plain questions when the suggestion fails", async () => {
    suggest.mockRejectedValue(new Error("down"));
    renderBuilder();
    await userEvent.type(screen.getByPlaceholderText("agentBuilder.ui.startPlaceholder"), "something{enter}");
    await screen.findByText("agentBuilder.ui.suggestFailed");
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
  });

  it(
    "creates an inactive draft once the Rules group is done and unlocks the test panel",
    async () => {
      renderBuilder();
      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
      for (let i = 0; i < 40 && create.mock.calls.length === 0; i++) await answerCurrent();
      await waitFor(() => expect(create).toHaveBeenCalledOnce());
      expect(create.mock.calls[0][0]).toMatchObject({ status: "inactive", type: "beauty", name: "Lotus", agentProfile: expect.objectContaining({ businessName: "Lotus" }) });
      await waitFor(() => expect(screen.getByTestId("test-panel")).toHaveTextContent("bot-1"));
      expect(screen.getByText("agentBuilder.ui.draftCreated")).toBeInTheDocument();
    },
    // Answers up to ~20 questions one at a time via userEvent; under the full
    // suite's parallel worker load this reliably exceeds the default 5s.
    15000,
  );

  it("lets the user edit an earlier answer", async () => {
    renderBuilder();
    await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
    await answerCurrent();
    await userEvent.click(screen.getByTitle("actions.edit"));
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
  });

  it("keeps a local answer through a hydrate refetch (e.g. after an autosave)", async () => {
    const original = createProfile("beauty", "en");
    original.businessName = "Lotus";
    const bot = (profile: typeof original) => ({
      id: "bot-9",
      status: "inactive",
      extraInstructions: "",
      agentProfile: profile,
    });

    chatbot.mockReturnValue({ chatbot: bot(original) });

    const route = "/ws/chatbot/create?chatbotId=bot-9";
    const { rerender } = render(
      <MemoryRouter initialEntries={[route]}>
        <AgentBuilder />
      </MemoryRouter>,
    );

    // Edit the (already-hydrated) businessName answer locally.
    await userEvent.click(screen.getByText("Lotus"));
    const input = screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" });
    await userEvent.clear(input);
    await userEvent.type(input, "Lotus Spa");
    await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
    expect(screen.getByText("Lotus Spa")).toBeInTheDocument();

    // Simulate the refetch every debounced autosave triggers (same chatbot
    // id, a new object reference, still the last-saved server snapshot).
    chatbot.mockReturnValue({ chatbot: bot({ ...original }) });
    rerender(
      <MemoryRouter initialEntries={[route]}>
        <AgentBuilder />
      </MemoryRouter>,
    );

    expect(screen.getByText("Lotus Spa")).toBeInTheDocument();
    expect(screen.queryByText("Lotus")).not.toBeInTheDocument();
  });

  it(
    "does not retry a failed draft create until an answer changes the profile",
    async () => {
      create.mockReset().mockRejectedValue(new Error("down"));
      renderBuilder();
      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
      for (let i = 0; i < 40 && create.mock.calls.length === 0; i++) await answerCurrent();
      await waitFor(() => expect(create).toHaveBeenCalledOnce());
      await new Promise((r) => setTimeout(r, 100));
      expect(create).toHaveBeenCalledOnce();

      await userEvent.click(screen.getAllByText("Lotus")[0]);
      const input = screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" });
      await userEvent.type(input, " Spa");
      await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
      await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    },
    15000,
  );

  describe("on a hydrated builder chatbot", () => {
    const route = "/ws/chatbot/create?chatbotId=bot-9";
    const profile = { ...createProfile("beauty", "en"), businessName: "Lotus" };
    const bot = (extra: Record<string, unknown> = {}) => ({
      id: "bot-9",
      status: "inactive",
      extraInstructions: "",
      agentProfile: profile,
      updatedAt: "2026-09-24T00:00:00.000Z",
      ...extra,
    });
    const tree = () => (
      <MemoryRouter initialEntries={[route]}>
        <AgentBuilder />
      </MemoryRouter>
    );
    const renameTo = async (name: string) => {
      await userEvent.click(screen.getByText(/^Lotus/));
      const input = screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" });
      await userEvent.clear(input);
      await userEvent.type(input, name);
      await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
    };
    const settle = () => new Promise((r) => setTimeout(r, 900));

    it("does not retry a failed autosave until an answer changes the profile", async () => {
      update.mockReset().mockRejectedValue(new Error("down"));
      chatbot.mockReturnValue({ chatbot: bot() });
      render(tree());
      await renameTo("Lotus Spa");
      await waitFor(() => expect(update).toHaveBeenCalledOnce());
      await settle();
      expect(update).toHaveBeenCalledOnce();

      await renameTo("Lotus Nails");
      await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    });

    it("sends no update when a refetch only changes read-only fields", async () => {
      chatbot.mockReturnValue({ chatbot: bot() });
      const { rerender } = render(tree());
      chatbot.mockReturnValue({ chatbot: bot({ updatedAt: "2026-09-24T01:00:00.000Z" }) });
      rerender(tree());
      await settle();
      expect(update).not.toHaveBeenCalled();
    });

    it("keeps the builder open and shows an error when activating fails", async () => {
      activate.mockRejectedValue(new Error("down"));
      chatbot.mockReturnValue({ chatbot: bot() });
      render(tree());
      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.ui.finish" }));
      await waitFor(() => expect(toastError).toHaveBeenCalledWith("chatbot.edit.error"));
      expect(screen.queryByText("agentBuilder.ui.finished")).toBeNull();
      expect(screen.getByRole("button", { name: "agentBuilder.ui.finish" })).toBeDefined();
    });

    it("flushes the pending autosave on unmount", async () => {
      chatbot.mockReturnValue({ chatbot: bot() });
      const { unmount } = render(tree());
      await renameTo("Lotus Spa");
      unmount();
      expect(update).toHaveBeenCalledOnce();
      expect(update.mock.calls[0][0]).toMatchObject({ id: "bot-9", body: { agentProfile: expect.objectContaining({ businessName: "Lotus Spa" }) } });
    });
  });

  it(
    "starts fresh when the chatbot has no builder profile, so the draft never takes its accounts",
    async () => {
      chatbot.mockReturnValue({
        chatbot: { id: "legacy-1", name: "Legacy bot", status: "active", accounts: [{ id: "acc-1" }], welcomeMessage: "Hi" },
      });
      render(
        <MemoryRouter initialEntries={["/ws/chatbot/create?chatbotId=legacy-1"]}>
          <AgentBuilder />
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));
      for (let i = 0; i < 40 && create.mock.calls.length === 0; i++) await answerCurrent();
      await waitFor(() => expect(create).toHaveBeenCalledOnce());
      expect(create.mock.calls[0][0]).toMatchObject({ accounts: [], name: "Lotus" });
    },
    15000,
  );
});
