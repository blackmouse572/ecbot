import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { describe, expect, it, vi } from "vitest";

const mutate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/hooks/api", () => ({
  useUpdateChatbot: () => ({ mutate, isPending: false }),
}));

vi.mock("@/hooks/use-date", () => ({
  useDate: () => ({ getFullDate: () => "date" }),
}));

import { ChatbotSummarySection } from "./chatbot-summary-section";

const item = {
  id: "bot-1",
  name: "Lotus",
  type: "beauty",
  status: "active",
  typingIndicator: true,
  autoRead: true,
  guardrailEnabled: true,
  primaryLanguage: "vi",
  modelProvider: "google",
  modelTextName: "google/gemini-2.5-flash",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  accounts: [],
} as unknown as ChatbotGetDetailResponseDto;

describe("ChatbotSummarySection", () => {
  it("sends only the flipped flag", async () => {
    const user = userEvent.setup();
    render(<ChatbotSummarySection item={item} />);

    // The behavior section is the first accordion; its trigger is an icon button.
    await user.click(screen.getAllByRole("button", { expanded: false })[0]);
    await user.click(screen.getAllByRole("switch")[0]);

    expect(mutate).toHaveBeenCalledWith({
      id: "bot-1",
      body: { typingIndicator: false },
    });
  });
});
