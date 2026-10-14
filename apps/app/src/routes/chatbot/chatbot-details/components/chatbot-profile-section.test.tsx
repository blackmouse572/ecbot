import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createProfile } from "@repo/agent-blueprint";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "ws" }),
}));

import { ChatbotProfileSection } from "./chatbot-profile-section";

const profile = {
  ...createProfile("restaurant", "vi"),
  businessName: "Bếp Nhà Mơ",
  agentName: "Mơ",
};

const item = {
  id: "bot-1",
  agentProfile: profile,
} as unknown as ChatbotGetDetailResponseDto;

describe("ChatbotProfileSection", () => {
  it("shows the builder answers under the builder's own group titles", () => {
    render(<ChatbotProfileSection item={item} />, { wrapper: MemoryRouter });

    expect(
      screen.getByText("agentBuilder.groups.identity"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bếp Nhà Mơ")).toBeInTheDocument();
  });

  it("keeps later groups behind a show-more toggle", async () => {
    render(<ChatbotProfileSection item={item} />, { wrapper: MemoryRouter });

    expect(
      screen.queryByText("agentBuilder.groups.interaction"),
    ).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /profile.showMore/ }));
    expect(
      screen.getByText("agentBuilder.groups.interaction"),
    ).toBeInTheDocument();
  });

  it("opens the builder on this chatbot to edit", () => {
    render(<ChatbotProfileSection item={item} />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole("link", { name: "agentBuilder.ui.editWithBuilder" }),
    ).toHaveAttribute("href", "/ws/chatbot/create?chatbotId=bot-1");
  });

  // Chatbots made before the builder have no profile; the builder would
  // start a new chatbot for them, so there is nothing to show or edit.
  it("renders nothing without a profile", () => {
    const { container } = render(
      <ChatbotProfileSection item={{ ...item, agentProfile: null } as never} />,
      { wrapper: MemoryRouter },
    );

    expect(container).toBeEmptyDOMElement();
  });
});
