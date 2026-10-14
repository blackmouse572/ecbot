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

describe("ChatbotSettingsFields model select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // Radix Select relies on pointer capture APIs jsdom doesn't implement.
    window.HTMLElement.prototype.hasPointerCapture = vi
      .fn()
      .mockReturnValue(false);
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  it("renders models grouped by provider from useChatbotModels and drops the provider select", async () => {
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

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();

    // The standalone "AI Provider" select is gone.
    expect(screen.queryByText("AI Provider")).not.toBeInTheDocument();

    const combos = screen.getAllByRole("combobox");
    const modelTrigger = combos[combos.length - 1];
    await user.click(modelTrigger);

    // Radix Select also renders a hidden native <select> mirror for form
    // semantics, so scope assertions to the visible listbox to avoid
    // duplicate-text matches.
    const listbox = within(screen.getByRole("listbox"));
    expect(listbox.getByText("openai")).toBeInTheDocument();
    expect(listbox.getByText("google")).toBeInTheDocument();
    expect(listbox.getByText("GPT-5.4")).toBeInTheDocument();
    expect(listbox.getByText("Gemini 2.5 Flash")).toBeInTheDocument();
  });

  it("shows a loading row while the model catalog is loading", async () => {
    mockedUseChatbotModels.mockReturnValue({
      models: [],
      isLoading: true,
    } as A);

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderForm();

    const combos = screen.getAllByRole("combobox");
    await user.click(combos[combos.length - 1]);

    expect(screen.getByText("Loading models...")).toBeInTheDocument();
  });
});
