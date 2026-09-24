import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentBuilder } from "./agent-builder";

const create = vi.fn();
const update = vi.fn();
const suggest = vi.fn();

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
  useToggleChatbotActivate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useChatbot: () => ({ chatbot: undefined }),
}));
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
    await userEvent.click(screen.getByTitle("agentBuilder.ui.editAnswer"));
    expect(screen.getByRole("group", { name: "agentBuilder.questions.businessType.title" })).toBeInTheDocument();
  });
});
