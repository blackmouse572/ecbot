import { render, screen } from "@testing-library/react";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

import { ChatbotMessagesSection } from "./chatbot-messages-section";

const item = {
  id: "bot-1",
  welcomeMessage: "Hi, how can I help?",
  fallbackMessage: null,
  handoffMessage: "  ",
} as unknown as ChatbotGetDetailResponseDto;

describe("ChatbotMessagesSection", () => {
  it("shows each message with when it is sent", () => {
    render(<ChatbotMessagesSection item={item} />, { wrapper: MemoryRouter });

    expect(screen.getByText("Hi, how can I help?")).toBeInTheDocument();
    expect(
      screen.getByText("chatbot.details.messages.welcomeWhen"),
    ).toBeInTheDocument();
  });

  it("says a blank message is not set instead of a dash", () => {
    render(<ChatbotMessagesSection item={item} />, { wrapper: MemoryRouter });

    expect(screen.getAllByText("chatbot.details.messages.notSet")).toHaveLength(
      2,
    );
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("edits only the messages", () => {
    render(<ChatbotMessagesSection item={item} />, { wrapper: MemoryRouter });

    expect(screen.getByRole("link", { name: "actions.edit" })).toHaveAttribute(
      "href",
      "/edit/messages",
    );
  });
});
