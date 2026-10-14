import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const mutate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/hooks/api", () => ({
  useUpdateChatbot: () => ({ mutate, isPending: false }),
}));

import { ChatbotSettingsSection } from "./chatbot-settings-section";

const item = {
  id: "bot-1",
  typingIndicator: true,
  autoRead: true,
  guardrailEnabled: true,
  handoffKeywords: ["gặp chủ"],
  modelTextName: "google/gemini-2.5-flash",
} as unknown as ChatbotGetDetailResponseDto;

describe("ChatbotSettingsSection", () => {
  // The switches sit in plain rows now, with no accordion to open first.
  it("sends only the flipped flag", async () => {
    render(<ChatbotSettingsSection item={item} />, { wrapper: MemoryRouter });

    await userEvent.setup().click(screen.getAllByRole("switch")[0]);

    expect(mutate).toHaveBeenCalledWith({
      id: "bot-1",
      body: { typingIndicator: false },
    });
  });

  it("edits the settings in their own drawer", () => {
    render(<ChatbotSettingsSection item={item} />, { wrapper: MemoryRouter });

    expect(screen.getByText("gặp chủ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "actions.edit" })).toHaveAttribute(
      "href",
      "/edit/settings",
    );
  });
});
