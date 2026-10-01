import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: () => null,
}));
vi.mock("./status-actions-menu", () => ({
  BotPauseSwitch: () => null,
  StatusActionsMenu: () => null,
}));
vi.mock("../components/status-pill", () => ({ StatusPill: () => null }));
vi.mock("../components/chatbot-badge", () => ({ ChatbotBadge: () => null }));

import { ConversationHeader } from "./conversation-header";

const conversation = {
  id: "c1",
  senderId: "s1",
  senderName: "Ngoc",
  account: { name: "Shop", type: "WEBSITE_WIDGET" },
} as never;

describe("ConversationHeader", () => {
  it("has no back or customer buttons on desktop", () => {
    render(<ConversationHeader conversation={conversation} />);
    expect(
      screen.queryByRole("button", { name: "actions.back" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Ngoc/ }),
    ).not.toBeInTheDocument();
  });

  it("on small screens goes back to the list and opens the customer", async () => {
    const onBack = vi.fn();
    const onOpenCustomer = vi.fn();
    render(
      <ConversationHeader
        conversation={conversation}
        onBack={onBack}
        onOpenCustomer={onOpenCustomer}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "actions.back" }));
    expect(onBack).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Ngoc/ }));
    expect(onOpenCustomer).toHaveBeenCalled();
  });
});
