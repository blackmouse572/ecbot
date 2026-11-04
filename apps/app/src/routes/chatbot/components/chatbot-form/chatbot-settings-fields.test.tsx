import { useChatbotModels } from "@/hooks/api/chatbot";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHATBOT_FORM_DEFAULTS } from "../../constants";
import { ChatbotSettingsFields } from "./chatbot-settings-fields";

vi.mock("@/hooks/api/chatbot", () => ({
  useChatbotModels: vi.fn(),
}));

// `SwitchBox` and `SingleAccordion` (from @repo/ui/common-components) are
// missing `React` imports and only transpile under the classic JSX runtime
// the app's real Vite config provides; the standalone vitest config doesn't
// load that plugin. Stub them out here since they're unrelated to the
// model-select behavior under test — `Form` (used throughout) stays real.
// `SingleAccordion` becomes a plain always-open passthrough so the "Advanced
// settings" fields are simply present in the DOM without needing to drive
// Radix Accordion's open/close interaction.
vi.mock("@repo/ui/common-components", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@repo/ui/common-components")>();
  return {
    ...actual,
    SwitchBox: () => <div data-testid="switch-box" />,
    SingleAccordion: {
      Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Item: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Header: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
      Content: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
    },
  };
});

const mockedUseChatbotModels = vi.mocked(useChatbotModels);

const Harness = () => {
  const form = useForm({ defaultValues: CHATBOT_FORM_DEFAULTS });
  return (
    <FormProvider {...form}>
      <ChatbotSettingsFields />
    </FormProvider>
  );
};

const renderForm = () => render(<Harness />);

describe("ChatbotSettingsFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // Popover primitives rely on pointer capture APIs jsdom doesn't implement.
    window.HTMLElement.prototype.hasPointerCapture = vi
      .fn()
      .mockReturnValue(false);
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  const twoModels = () =>
    mockedUseChatbotModels.mockReturnValue({
      models: [
        {
          id: "openai/gpt-5.4",
          name: "GPT-5.4",
          provider: "openai",
          contextLength: null,
        },
        {
          id: "google/gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          provider: "google",
          contextLength: null,
        },
      ],
      isLoading: false,
    } as A);

  it("lists models in one group per provider", async () => {
    twoModels();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();

    // The standalone "AI Provider" select is gone.
    expect(screen.queryByText("AI Provider")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));

    const openai = within(await screen.findByRole("group", { name: "openai" }));
    const google = within(screen.getByRole("group", { name: "google" }));
    expect(
      screen
        .getByRole("group", { name: "openai" })
        .querySelector('img[src="/icons/providers/openai.svg"]'),
    ).not.toBeNull();
    expect(openai.getByRole("option", { name: "GPT-5.4" })).toBeInTheDocument();
    expect(
      google.getByRole("option", { name: "Gemini 2.5 Flash" }),
    ).toBeInTheDocument();
  });

  it("filters by model name or provider name", async () => {
    twoModels();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();
    const input = screen.getByRole("combobox");

    await user.type(input, "gem");
    expect(
      await screen.findByRole("option", { name: "Gemini 2.5 Flash" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "GPT-5.4" }),
    ).not.toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "openai");
    expect(
      await screen.findByRole("option", { name: "GPT-5.4" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Gemini 2.5 Flash" }),
    ).not.toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "zzz");
    expect(await screen.findByText("No model matches")).toBeInTheDocument();
  });

  it("picking a model shows its name in the field", async () => {
    twoModels();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.click(
      await screen.findByRole("option", { name: "Gemini 2.5 Flash" }),
    );

    expect(input).toHaveValue("Gemini 2.5 Flash");
    // The picked model's provider logo sits in the field.
    expect(
      input.parentElement!.querySelector(
        'img[src="/icons/providers/google.svg"]',
      ),
    ).not.toBeNull();
  });

  it("labels the field and its open button for screen readers", () => {
    twoModels();
    renderForm();

    expect(screen.getByLabelText("AI Model")).toBe(
      screen.getByRole("combobox"),
    );
    expect(
      screen.getByRole("button", { name: "Show models" }),
    ).toBeInTheDocument();
  });

  it("keeps the picked model when the text is cleared, since a model is required", async () => {
    twoModels();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.click(
      await screen.findByRole("option", { name: "Gemini 2.5 Flash" }),
    );
    await user.clear(input);
    await user.keyboard("{Escape}");
    await user.tab();

    expect(input).toHaveValue("Gemini 2.5 Flash");
  });

  it("shows a loading row while the model catalog is loading", async () => {
    mockedUseChatbotModels.mockReturnValue({
      models: [],
      isLoading: true,
    } as A);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();

    await user.click(screen.getByRole("combobox"));

    expect(await screen.findByText("Loading models...")).toBeInTheDocument();
  });

  it("shows the model, handoff keywords and follow-up rules before Advanced", () => {
    mockedUseChatbotModels.mockReturnValue({
      models: [],
      isLoading: false,
    } as A);
    renderForm();

    const advanced = screen.getByText("Advanced Settings");
    for (const key of ["AI Model", "Handoff Keywords", "Follow-up rules"]) {
      const label = screen.getByText(key);
      expect(
        label.compareDocumentPosition(advanced) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    const maxTokens = screen.getByText("Max Tokens");
    expect(
      advanced.compareDocumentPosition(maxTokens) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
