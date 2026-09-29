import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/api/chatbot", () => ({
  useUpdateChatbot: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("@/components/common/tiptap-editor/tiptap-editor", () => ({
  TipTapEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <textarea
      aria-label="editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import { ChatbotGeneralKnowledgeSection } from "./chatbot-general-knowledge";

const item = {
  id: "bot-1",
  name: "Lotus",
  extraInstructions: "old",
  guardrailEnabled: true,
  handoffMessage: "A person will reply soon",
  accounts: [],
} as unknown as ChatbotGetDetailResponseDto;

describe("ChatbotGeneralKnowledgeSection", () => {
  // PUT /chatbots/:id merges, so sending only the edited field leaves the
  // guardrail and handoff settings as they are.
  it("sends only extraInstructions on save", async () => {
    const user = userEvent.setup();
    render(<ChatbotGeneralKnowledgeSection item={item} />);

    await user.click(screen.getByRole("button"));
    await user.clear(screen.getByLabelText("editor"));
    await user.type(screen.getByLabelText("editor"), "new");
    await user.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "bot-1",
        body: { extraInstructions: "new" },
      }),
    );
  });

  // #172: the section is "Extra instructions", so it must not show the whole
  // compiled system prompt that the builder generates.
  it("shows the extra instructions, not the compiled prompt, for builder agents", () => {
    render(
      <ChatbotGeneralKnowledgeSection
        item={
          {
            ...item,
            agentProfile: { version: 1 },
            extraInstructions: "Closed on Mondays.",
            generalKnowledge:
              "# Linh · Lotus\n## Requirements\nCompiled prompt",
          } as unknown as ChatbotGetDetailResponseDto
        }
      />,
    );
    expect(screen.getByText("Closed on Mondays.")).toBeInTheDocument();
    expect(screen.queryByText(/Compiled prompt/)).not.toBeInTheDocument();
  });

  it("shows the hint when a builder agent has no extra instructions", () => {
    render(
      <ChatbotGeneralKnowledgeSection
        item={
          {
            ...item,
            agentProfile: { version: 1 },
            extraInstructions: null,
            generalKnowledge: "Compiled prompt",
          } as unknown as ChatbotGetDetailResponseDto
        }
      />,
    );
    expect(
      screen.getByText("agentBuilder.ui.extraInstructionsHint"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Compiled prompt")).not.toBeInTheDocument();
  });
});
