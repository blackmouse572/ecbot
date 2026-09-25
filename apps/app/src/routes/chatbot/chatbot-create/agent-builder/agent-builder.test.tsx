import { createProfile } from "@repo/agent-blueprint";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentBuilder } from "./agent-builder";

// Same pattern as `hooks/use-media-query.test.ts`: stub `window.matchMedia`
// to pin the viewport the test exercises (desktop vs. mobile test panel).
const mockMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
};

// A matchMedia stub whose result can flip live and notify useMediaQuery's
// "change" listener, to simulate actually crossing the md breakpoint.
const mockMatchMediaToggleable = (initial: boolean) => {
  let matches = initial;
  let onChange: (() => void) | null = null;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_event: string, cb: () => void) => {
        onChange = cb;
      },
      removeEventListener: () => {
        onChange = null;
      },
    })),
  );
  return {
    flip: () => {
      matches = !matches;
      onChange?.();
    },
  };
};

const testPanelMounts = vi.fn();

const create = vi.fn();
const update = vi.fn();
const suggest = vi.fn();
const chatbot = vi.fn();
const activate = vi.fn();
const toastError = vi.fn();
const unlinkAccounts = vi.fn();
const linkAccount = vi.fn();
const linkChatbotAccount = vi.fn();
const unlinkChatbotAccount = vi.fn();
const provisionWebsiteWidget = vi.fn();
const oAuthLoginClick = vi.fn();

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
  // The channels question mounts ChannelConnect once it's reached; these
  // stubs keep the rest of this suite (which isn't exercising channel
  // connect behavior) from hitting the real account hooks and their
  // QueryClient/workspace requirements. channel-connect.test.tsx covers the
  // actual connect behavior with its own, more specific mocks.
  useUnlinkAccounts: (...args: unknown[]) => unlinkAccounts(...args),
  useLinkAccount: () => ({ mutateAsync: linkAccount, isPending: false }),
  useLinkChatbotAccount: () => ({ mutateAsync: linkChatbotAccount, isPending: false }),
  useUnlinkChatbotAccount: () => ({ mutateAsync: unlinkChatbotAccount, isPending: false }),
  useProvisionWebsiteWidget: () => ({ mutateAsync: provisionWebsiteWidget, isPending: false }),
}));
vi.mock("@/hooks/use-oauth-login", () => ({
  useOAuthLogin: () => ({ handleLinkClick: oAuthLoginClick }),
}));
vi.mock("@medusajs/ui", async () => {
  const actual = await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast: { ...actual.toast, error: (...args: unknown[]) => toastError(...args) } };
});
vi.mock("@/hooks/api/agent-builder", () => ({
  useAgentBuilderSuggest: () => ({ mutateAsync: suggest, isPending: false }),
}));
vi.mock("./components/test-panel", () => ({
  TestPanel: ({ chatbotId }: { chatbotId: string | null }) => {
    useEffect(() => {
      testPanelMounts();
    }, []);
    return <div data-testid="test-panel">{chatbotId ?? "locked"}</div>;
  },
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

const pickBeautyTemplate = () => userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.beauty" }));

// The draft is created once agentName (step 3) is answered: businessName,
// then agentName, both text questions that answerCurrent fills with "Lotus".
async function answerToAgentName() {
  await answerCurrent(); // businessName
  await answerCurrent(); // agentName
}

describe("AgentBuilder", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ data: { data: { id: "bot-1" } } });
    update.mockReset().mockResolvedValue({});
    suggest.mockReset();
    chatbot.mockReset().mockReturnValue({ chatbot: undefined });
    activate.mockReset().mockResolvedValue({});
    toastError.mockReset();
    testPanelMounts.mockReset();
    unlinkAccounts.mockReset().mockReturnValue({ accounts: [] });
    linkAccount.mockReset();
    linkChatbotAccount.mockReset();
    unlinkChatbotAccount.mockReset();
    provisionWebsiteWidget.mockReset();
    oAuthLoginClick.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  describe("the hero (step 0)", () => {
    it("shows the title, subtitle, a large input and template cards", () => {
      renderBuilder();
      expect(screen.getByRole("heading", { name: "agentBuilder.ui.heroTitle" })).toBeInTheDocument();
      expect(screen.getByText("agentBuilder.ui.heroSubtitle")).toBeInTheDocument();
      const input = screen.getByPlaceholderText("agentBuilder.ui.startPlaceholder");
      expect(input).toHaveAttribute("rows", "4");
      expect(screen.getByRole("button", { name: "agentBuilder.types.beauty" })).toBeInTheDocument();
    });

    it("starts that template when a card is clicked", async () => {
      renderBuilder();
      await pickBeautyTemplate();
      // The template already chose the business type (section B), so it asks
      // for the business name next instead of asking the type again.
      expect(screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" })).toBeInTheDocument();
      expect(screen.getByText("agentBuilder.groups.identity")).toBeInTheDocument();
    });
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

  it("shows a business-type icon on each businessType choice", async () => {
    suggest.mockRejectedValue(new Error("down"));
    renderBuilder();
    await userEvent.type(screen.getByPlaceholderText("agentBuilder.ui.startPlaceholder"), "something{enter}");
    await screen.findByRole("group", { name: "agentBuilder.questions.businessType.title" });
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    for (const radio of radios) {
      expect(radio.closest("label")?.querySelector("svg")).toBeInTheDocument();
    }
  });

  it("shows a platform logo on each channel card (the channels turn connects real channels)", async () => {
    renderBuilder();
    await pickBeautyTemplate();
    await answerCurrent(); // businessName
    await answerCurrent(); // agentName
    await screen.findByText("agentBuilder.channels.messenger");
    for (const channel of ["messenger", "zalo", "telegram", "website", "instagram", "tiktok", "shopee"]) {
      const card = screen.getByText(`agentBuilder.channels.${channel}`).closest("button");
      expect(card?.querySelector("img")).toBeInTheDocument();
    }
  });

  describe("a question turn", () => {
    it("shows the friendly ask on the left and the lead-in on the right for the current question", async () => {
      renderBuilder();
      await pickBeautyTemplate();
      expect(screen.getByText("agentBuilder.questions.businessName.ask")).toBeInTheDocument();
      expect(screen.getByText("agentBuilder.questions.businessName.lead")).toBeInTheDocument();
    });

    it("shows an answered step as the ask, then the lead-in and answer given", async () => {
      renderBuilder();
      await pickBeautyTemplate();
      await answerCurrent();
      const asked = screen.getByText("agentBuilder.questions.businessName.ask");
      const answered = screen.getByText(/Lotus/);
      expect(asked).toBeInTheDocument();
      expect(answered).toBeInTheDocument();
      expect(answered.textContent).toBe("agentBuilder.questions.businessName.lead Lotus");
      // The assistant "asked" bubble comes before the user "answered" bubble.
      expect(asked.compareDocumentPosition(answered) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("shows step 0 as a pair using the hero subtitle, and its answer bubble goes back to the hero", async () => {
    renderBuilder();
    await pickBeautyTemplate();
    expect(screen.getByText("agentBuilder.ui.heroSubtitle")).toBeInTheDocument();
    expect(screen.getByText("agentBuilder.ui.templateAnswer")).toBeInTheDocument();

    await userEvent.click(screen.getByText("agentBuilder.ui.templateAnswer"));
    expect(screen.getByRole("heading", { name: "agentBuilder.ui.heroTitle" })).toBeInTheDocument();
  });

  it("updates the same draft instead of creating a second one after going back to the hero", async () => {
    renderBuilder();
    await pickBeautyTemplate();
    await answerToAgentName();
    await waitFor(() => expect(create).toHaveBeenCalledOnce());

    await userEvent.click(screen.getByText("agentBuilder.ui.templateAnswer"));
    await userEvent.click(screen.getByRole("button", { name: "agentBuilder.types.restaurant" }));
    await waitFor(() => expect(update).toHaveBeenCalled(), { timeout: 2000 });

    expect(create).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0]).toMatchObject({ id: "bot-1" });
  });

  it("creates an inactive draft once agentName (step 3) is answered, and unlocks the test panel", async () => {
    renderBuilder();
    await pickBeautyTemplate();
    await answerCurrent(); // businessName
    expect(create).not.toHaveBeenCalled();
    await answerCurrent(); // agentName
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toMatchObject({ status: "inactive", type: "beauty" });
    await waitFor(() => expect(screen.getByTestId("test-panel")).toHaveTextContent("bot-1"));
    // Moved to right after the agent-name answer (batch 3, step 3).
    expect(screen.getByText("agentBuilder.ui.draftCreated")).toBeInTheDocument();
    const agentNameAnswer = screen.getByText(/agentBuilder.questions.agentName.lead/);
    const draftCreated = screen.getByText("agentBuilder.ui.draftCreated");
    expect(agentNameAnswer.compareDocumentPosition(draftCreated) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets the user edit an earlier answer", async () => {
    renderBuilder();
    await pickBeautyTemplate();
    await answerCurrent();
    await userEvent.click(screen.getByText(/Lotus/));
    expect(screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" })).toBeInTheDocument();
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
    await userEvent.click(screen.getByText(/Lotus/));
    const input = screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" });
    await userEvent.clear(input);
    await userEvent.type(input, "Lotus Spa");
    await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
    expect(screen.getByText(/Lotus Spa$/)).toBeInTheDocument();

    // Simulate the refetch every debounced autosave triggers (same chatbot
    // id, a new object reference, still the last-saved server snapshot).
    chatbot.mockReturnValue({ chatbot: bot({ ...original }) });
    rerender(
      <MemoryRouter initialEntries={[route]}>
        <AgentBuilder />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Lotus Spa$/)).toBeInTheDocument();
    expect(screen.queryByText(/(?<!Spa )Lotus$/)).not.toBeInTheDocument();
  });

  it("does not retry a failed draft create until an answer changes the profile", async () => {
    create.mockReset().mockRejectedValue(new Error("down"));
    renderBuilder();
    await pickBeautyTemplate();
    await answerToAgentName();
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    await new Promise((r) => setTimeout(r, 100));
    expect(create).toHaveBeenCalledOnce();

    // Re-edit businessName so the payload actually changes (answering
    // channels with nothing selected would leave the payload identical).
    // Both businessName and agentName read "Lotus" at this point, so match
    // the businessName answer specifically.
    await userEvent.click(screen.getByText(/businessName\.lead Lotus/));
    const input = screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" });
    await userEvent.type(input, " Spa");
    await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  });

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
      await userEvent.click(screen.getByText(/Lotus/));
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

    // Section 4's autosave safety rule: `accounts` must never regress to a
    // stale non-empty list, or the next autosave would REPLACE the whole
    // set server-side and drop whatever was just linked.
    it("keeps a channel linked through the channels turn in the next autosave's accounts", async () => {
      chatbot.mockReturnValue({
        chatbot: bot({ accounts: [{ id: "a1", type: "FACEBOOK_ACCOUNT", name: "Existing" }] }),
      });
      linkAccount.mockResolvedValue({ data: { data: { id: "a2", type: "TELEGRAM_BOT", name: "New Bot" } } });
      linkChatbotAccount.mockResolvedValue({});
      render(tree());

      // Reopen the (already-hydrated) channels turn and link a Telegram bot.
      await userEvent.click(screen.getByText(/agentBuilder\.questions\.channels\.lead/));
      await userEvent.click(screen.getByText("agentBuilder.channels.telegram"));
      const token = `123456:${"A".repeat(40)}`;
      await userEvent.type(screen.getByLabelText("agentBuilder.ui.telegramTokenLabel"), token);
      await userEvent.click(screen.getByRole("button", { name: "accounts.create.connect.telegram.cta" }));
      await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["a2"] }));

      // An unrelated answer edit triggers the next autosave.
      await renameTo("Lotus Spa");
      await waitFor(() => expect(update).toHaveBeenCalled());
      const lastBody = update.mock.calls.at(-1)?.[0]?.body;
      expect(lastBody.accounts).toEqual(expect.arrayContaining(["a1", "a2"]));
    });

    // Section 4's autosave safety fix, hardened by review round 1 item 5:
    // `accounts` is replace-all server side, so a link and a debounced
    // autosave firing at the same time can still race even with
    // linkedAccounts tracked locally. Uses deferred promises to prove the
    // two are actually serialized, not just usually fast enough.
    it("does not autosave while a link is in flight, then sends one save with the current set once it settles", async () => {
      chatbot.mockReturnValue({
        chatbot: bot({ accounts: [{ id: "a1", type: "FACEBOOK_ACCOUNT", name: "Existing" }] }),
      });
      linkAccount.mockResolvedValue({ data: { data: { id: "a2", type: "TELEGRAM_BOT", name: "New Bot" } } });
      let resolveLink: (v: unknown) => void = () => {};
      linkChatbotAccount.mockReturnValue(new Promise((r) => { resolveLink = r; }));
      render(tree());

      await userEvent.click(screen.getByText(/agentBuilder\.questions\.channels\.lead/));
      await userEvent.click(screen.getByText("agentBuilder.channels.telegram"));
      const token = `123456:${"A".repeat(40)}`;
      await userEvent.type(screen.getByLabelText("agentBuilder.ui.telegramTokenLabel"), token);
      await userEvent.click(screen.getByRole("button", { name: "accounts.create.connect.telegram.cta" }));
      await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalled());

      // An unrelated edit would normally schedule a debounced autosave;
      // while the link above is still pending, it must not fire.
      await renameTo("Lotus Spa");
      await new Promise((r) => setTimeout(r, 900));
      expect(update).not.toHaveBeenCalled();

      // Settle the link, then the debounce reschedules with the current set.
      resolveLink({});
      await waitFor(() => expect(update).toHaveBeenCalled(), { timeout: 2000 });
      const lastBody = update.mock.calls.at(-1)?.[0]?.body;
      expect(lastBody.accounts).toEqual(expect.arrayContaining(["a1", "a2"]));
    });

    // Fix round 2, item 6: a debounced answer queued just before a link
    // starts must not be silently dropped if the builder unmounts while
    // that link is still in flight (accountsBusy blocks the debounce from
    // firing, but the queued edit itself must survive to the unmount flush).
    it("flushes a debounced answer that was pending when a link started, if the builder unmounts mid-link", async () => {
      chatbot.mockReturnValue({
        chatbot: bot({ accounts: [{ id: "a1", type: "FACEBOOK_ACCOUNT", name: "Existing" }] }),
      });
      linkAccount.mockResolvedValue({ data: { data: { id: "a2", type: "TELEGRAM_BOT", name: "New Bot" } } });
      // Never resolves: the link is still in flight when the builder unmounts.
      linkChatbotAccount.mockReturnValue(new Promise(() => {}));
      const { unmount } = render(tree());

      // Queue an unrelated debounced answer edit first, before any link starts.
      await renameTo("Lotus Spa");

      // Before that debounce fires, start a link: accountsBusy flips true
      // partway through the queued edit's debounce window.
      await userEvent.click(screen.getByText(/agentBuilder\.questions\.channels\.lead/));
      await userEvent.click(screen.getByText("agentBuilder.channels.telegram"));
      const token = `123456:${"A".repeat(40)}`;
      await userEvent.type(screen.getByLabelText("agentBuilder.ui.telegramTokenLabel"), token);
      await userEvent.click(screen.getByRole("button", { name: "accounts.create.connect.telegram.cta" }));
      await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalled());

      unmount();

      expect(update).toHaveBeenCalled();
      expect(update.mock.calls.at(-1)?.[0]).toMatchObject({
        id: "bot-9",
        body: { agentProfile: expect.objectContaining({ businessName: "Lotus Spa" }) },
      });
    });
  });

  it("starts fresh when the chatbot has no builder profile, so the draft never takes its accounts", async () => {
    chatbot.mockReturnValue({
      chatbot: { id: "legacy-1", name: "Legacy bot", status: "active", accounts: [{ id: "acc-1" }], welcomeMessage: "Hi" },
    });
    render(
      <MemoryRouter initialEntries={["/ws/chatbot/create?chatbotId=legacy-1"]}>
        <AgentBuilder />
      </MemoryRouter>,
    );
    await pickBeautyTemplate();
    await answerToAgentName();
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toMatchObject({ accounts: [] });
  });

  describe("the test panel", () => {
    const desktopPanel = () => screen.getByTestId("test-panel").closest('[aria-hidden], [inert]') ?? screen.getByTestId("test-panel").parentElement!.parentElement!;

    it("shows neither the panel nor the Try agent button before the draft exists", () => {
      mockMatchMedia(true);
      renderBuilder();
      expect(screen.queryByRole("button", { name: "agentBuilder.ui.tryAgent" })).not.toBeInTheDocument();
      expect(screen.queryByTestId("test-panel")).not.toBeInTheDocument();
    });

    // Panel visibility and the auto-open-once effect now key off the same
    // signal (chatbotId), so by the time the header button exists, the
    // panel has already auto-opened: there is no longer an observable
    // "unlocked but still collapsed, draft still creating" state (that
    // required chatbotId, which is exactly what unlocks the button/panel).

    it("the header toggle opens and closes it on desktop (already auto-opened once the draft exists)", async () => {
      mockMatchMedia(true);
      renderBuilder();
      await pickBeautyTemplate();
      await answerToAgentName();
      await waitFor(() => expect(screen.getByRole("button", { name: "agentBuilder.ui.tryAgent" })).toBeInTheDocument());
      await waitFor(() => expect(desktopPanel()).not.toHaveAttribute("aria-hidden"));

      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.ui.tryAgent" }));
      expect(desktopPanel()).toHaveAttribute("aria-hidden", "true");

      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.ui.tryAgent" }));
      expect(desktopPanel()).not.toHaveAttribute("aria-hidden");
    });

    it("opens automatically once the draft chatbot is created, and stays closed once the user closes it", async () => {
      mockMatchMedia(true);
      renderBuilder();
      await pickBeautyTemplate();
      await answerToAgentName();
      await waitFor(() => expect(create).toHaveBeenCalledOnce());
      await waitFor(() => expect(desktopPanel()).not.toHaveAttribute("aria-hidden"));

      // Closing it by hand is respected: it does not reopen itself again.
      await userEvent.click(screen.getByRole("button", { name: "agentBuilder.ui.tryAgent" }));
      expect(desktopPanel()).toHaveAttribute("aria-hidden", "true");

      // ...even once a later answer triggers another save.
      await userEvent.click(screen.getByText(/businessName\.lead Lotus/));
      const input = screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" });
      await userEvent.type(input, " Spa");
      await userEvent.click(screen.getByRole("button", { name: "actions.next" }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(desktopPanel()).toHaveAttribute("aria-hidden", "true");
    });

    it("is a full-screen sheet on mobile, opened by the floating button and closed by its own close control", async () => {
      mockMatchMedia(false);
      renderBuilder();
      await pickBeautyTemplate();
      await answerToAgentName();
      await waitFor(() => expect(screen.getByTestId("test-panel")).toBeInTheDocument());

      const sheet = screen.getByTestId("test-panel").closest("aside")!;
      expect(sheet).toHaveAttribute("aria-hidden", "true");

      // Both the header toggle and the floating "Try agent" button share the
      // same label on mobile; the floating one is the last in the DOM.
      const tryAgentButtons = screen.getAllByRole("button", { name: "agentBuilder.ui.tryAgent" });
      await userEvent.click(tryAgentButtons[tryAgentButtons.length - 1]!);
      expect(sheet).not.toHaveAttribute("aria-hidden");

      await userEvent.click(screen.getByRole("button", { name: "actions.close" }));
      expect(sheet).toHaveAttribute("aria-hidden", "true");
    });

    it("does not remount TestPanel (and its chat session) when the viewport crosses the md breakpoint", async () => {
      const viewport = mockMatchMediaToggleable(true); // start desktop
      renderBuilder();
      await pickBeautyTemplate();
      await answerToAgentName();
      await waitFor(() => expect(screen.getByTestId("test-panel")).toBeInTheDocument());
      expect(testPanelMounts).toHaveBeenCalledOnce();

      // Cross from desktop to mobile, and back.
      act(() => viewport.flip());
      await waitFor(() => expect(screen.getByTestId("test-panel")).toBeInTheDocument());
      expect(testPanelMounts).toHaveBeenCalledOnce();

      act(() => viewport.flip());
      await waitFor(() => expect(screen.getByTestId("test-panel")).toBeInTheDocument());
      expect(testPanelMounts).toHaveBeenCalledOnce();
    });
  });
});
