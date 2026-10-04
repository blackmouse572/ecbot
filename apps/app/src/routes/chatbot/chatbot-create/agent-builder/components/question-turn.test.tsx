import i18n from "@/i18n";
import {
  buildQuestionGroups,
  createProfile,
  type AgentProfile,
} from "@repo/agent-blueprint";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { QuestionTurn } from "./question-turn";

const renderQuestion = (profile: AgentProfile, id: string) => {
  const question = buildQuestionGroups(profile)
    .flatMap((g) => g.questions)
    .find((q) => q.id === id)!;
  render(
    <QuestionTurn
      question={question}
      profile={profile}
      suggestion={null}
      position={{ current: 1, total: 20 }}
      onAnswer={vi.fn()}
      onSkip={vi.fn()}
      chatbotId={null}
      linkedAccounts={[]}
      onAccountsLinked={vi.fn()}
      onAccountsUnlinked={vi.fn()}
    />,
  );
  return screen.getByRole("textbox");
};

describe("QuestionTurn placeholders", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("shows a business name example that fits the chosen type", () => {
    expect(
      renderQuestion(createProfile("restaurant", "en"), "businessName"),
    ).toHaveAttribute("placeholder", "Bếp Nhà Mơ");
  });

  it("builds the greeting example from the names already given", () => {
    const profile = {
      ...createProfile("ecommerce", "en"),
      businessName: "Kunmart",
      agentName: "Bé Kun",
    };
    expect(renderQuestion(profile, "greeting")).toHaveAttribute(
      "placeholder",
      "Hi! This is Bé Kun from Kunmart. How can I help?",
    );
  });

  it("falls back to the type's example names when none are given yet", () => {
    expect(
      renderQuestion(createProfile("ecommerce", "en"), "greeting"),
    ).toHaveAttribute(
      "placeholder",
      "Hi! This is Linh from Kunmart. How can I help?",
    );
  });
});

// #160: the handoff step never said how the owner finds out about a handoff.
describe("QuestionTurn handoff step", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("says the owner is notified in the app", () => {
    const profile = createProfile("ecommerce", "en");
    const question = buildQuestionGroups(profile)
      .flatMap((g) => g.questions)
      .find((q) => q.id === "handoffWhen")!;
    render(
      <QuestionTurn
        question={question}
        profile={profile}
        suggestion={null}
        position={{ current: 1, total: 20 }}
        onAnswer={vi.fn()}
        onSkip={vi.fn()}
        chatbotId={null}
        linkedAccounts={[]}
        onAccountsLinked={vi.fn()}
        onAccountsUnlinked={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "When should your agent hand the chat over to you? When it does, you and your team get a notification in the app (the bell at the top) with a link to the chat.",
      ),
    ).toBeInTheDocument();
    expect(
      i18n.t("agentBuilder.questions.handoffWhen.ask", { lng: "vi" }),
    ).toBe(
      "Khi nào agent nên chuyển cuộc trò chuyện cho bạn? Khi đó, bạn và đội ngũ sẽ nhận thông báo trong ứng dụng (biểu tượng chuông ở trên cùng) kèm đường dẫn tới cuộc trò chuyện.",
    );
  });
});
