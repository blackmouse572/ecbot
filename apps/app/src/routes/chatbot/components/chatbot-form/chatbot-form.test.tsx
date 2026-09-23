import { useChatbotModels } from "@/hooks/api/chatbot";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHATBOT_FORM_DEFAULTS } from "../../constants";
import { ChatbotForm } from "./chatbot-form";

vi.mock("@/hooks/api/chatbot", () => ({
  useChatbotModels: vi.fn(),
}));

vi.mock("@/components/common/tiptap-editor", () => ({
  TipTapEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("../linked-accounts-field", () => ({
  LinkedAccountsField: () => <div data-testid="linked-accounts-field" />,
}));

vi.mock("./chatbot-type-field", () => ({
  ChatbotTypeField: () => <div data-testid="chatbot-type-field" />,
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

vi.mock("@/components/modals", () => ({
  RouteFocusModal: Object.assign(
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
    {
      Header: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
      Body: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
      Form: ({ form, children }: { form: A; children: React.ReactNode }) => (
        <FormProvider {...form}>{children}</FormProvider>
      ),
    },
  ),
}));

const mockedUseChatbotModels = vi.mocked(useChatbotModels);

const baseProps = {
  onCancel: vi.fn(),
  title: "Create chatbot",
  submitText: "Create",
  cancelText: "Cancel",
  nameLabel: "Name",
  generalKnowledgeLabel: "General knowledge",
  generalKnowledgePlaceholder: "placeholder",
  typeLabel: "Type",
};

describe("ChatbotForm model select", () => {
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
    render(<ChatbotForm {...baseProps} onSubmit={vi.fn()} />);

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
    render(<ChatbotForm {...baseProps} onSubmit={vi.fn()} />);

    const combos = screen.getAllByRole("combobox");
    await user.click(combos[combos.length - 1]);

    expect(screen.getByText("Loading models...")).toBeInTheDocument();
  });

  it("submits a payload without modelProvider", async () => {
    mockedUseChatbotModels.mockReturnValue({
      models: [
        {
          id: "google/gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          provider: "google",
          contextLength: null,
        },
      ],
      isLoading: false,
    } as A);

    const onSubmit = vi.fn(async () => {});
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <ChatbotForm
        {...baseProps}
        onSubmit={onSubmit}
        defaultValues={CHATBOT_FORM_DEFAULTS}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Enter chatbot name"),
      "My bot",
    );
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty("modelProvider");
    expect(payload.modelTextName).toBe("google/gemini-2.5-flash");
    // handleSubmit hands over the parsed output, so the coerced field is a
    // number here even though the input held a string.
    expect(typeof payload.modelTemperature).toBe("number");
  });

  // A resolver that can't read zod 4's errors rethrows instead of populating
  // formState, leaving the field unmarked and the form silently unsubmittable.
  it("marks the field invalid and blocks submit when name is empty", async () => {
    mockedUseChatbotModels.mockReturnValue({
      models: [
        {
          id: "google/gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          provider: "google",
          contextLength: null,
        },
      ],
      isLoading: false,
    } as A);

    const onSubmit = vi.fn(async () => {});
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <ChatbotForm
        {...baseProps}
        onSubmit={onSubmit}
        defaultValues={CHATBOT_FORM_DEFAULTS}
      />,
    );

    // The defaults seed a generated name, so clear it to get invalid input.
    await user.clear(screen.getByPlaceholderText("Enter chatbot name"));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter chatbot name")).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
