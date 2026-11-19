import { fireEvent, render, screen } from "@testing-library/react";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

import { ChatbotNextStepsSection } from "./chatbot-next-steps-section";

const bot = (fields: Partial<ChatbotGetDetailResponseDto>) =>
  ({
    id: "bot-1",
    accounts: [],
    welcomeMessage: null,
    ...fields,
  }) as unknown as ChatbotGetDetailResponseDto;

const renderSection = (
  item: ChatbotGetDetailResponseDto,
  knowledgeCount = 0,
  onOpenKnowledge = vi.fn(),
) =>
  render(
    <MemoryRouter initialEntries={["/acme/chatbot/bot-1"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/chatbot/:id"
          element={
            <ChatbotNextStepsSection
              item={item}
              knowledgeCount={knowledgeCount}
              onOpenKnowledge={onOpenKnowledge}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ChatbotNextStepsSection", () => {
  it("lists only the steps still to do", () => {
    renderSection(bot({ welcomeMessage: "Hi" }));

    expect(
      screen.getByText("chatbot.details.nextSteps.steps.channel.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("chatbot.details.nextSteps.steps.knowledge.title"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("chatbot.details.nextSteps.steps.welcome.title"),
    ).not.toBeInTheDocument();
  });

  it("links each step to where it is done", () => {
    renderSection(bot({}));

    expect(
      screen.getByRole("link", {
        name: /chatbot.details.nextSteps.steps.channel.title/,
      }),
    ).toHaveAttribute("href", "/acme/accounts/create");
    expect(
      screen.getByRole("link", {
        name: /chatbot.details.nextSteps.steps.welcome.title/,
      }),
    ).toHaveAttribute("href", "/acme/chatbot/bot-1/edit/messages");
  });

  it("opens the knowledge tab for the knowledge step", () => {
    const onOpenKnowledge = vi.fn();
    renderSection(bot({}), 0, onOpenKnowledge);

    fireEvent.click(
      screen.getByRole("button", {
        name: /chatbot.details.nextSteps.steps.knowledge.title/,
      }),
    );

    expect(onOpenKnowledge).toHaveBeenCalled();
  });

  it("hides the card once everything is done", () => {
    const { container } = renderSection(
      bot({
        accounts: [{ id: "a" }] as never,
        welcomeMessage: "Hi",
      }),
      3,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
