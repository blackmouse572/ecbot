import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@medusajs/ui";
import { useConversation } from "@/hooks/api/conversations";
import { TimezoneSection } from "./timezone-section";

// cmdk scrolls the active item into view; jsdom has no layout.
Element.prototype.scrollIntoView = vi.fn();

const mutateAsync = vi.fn(() => Promise.resolve());

vi.mock("@/hooks/api/conversations", () => ({
  useConversation: vi.fn(),
  useUpdateConversationTimezone: () => ({ mutateAsync }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { zone?: string }) =>
      opts?.zone ? `${key}:${opts.zone}` : key,
  }),
}));

const withConversation = (conversation: object) =>
  vi.mocked(useConversation).mockReturnValue({
    conversation,
    isPending: false,
    isError: false,
  } as never);

const renderSection = () =>
  render(
    <TooltipProvider>
      <TimezoneSection conversationId="conv-1" />
    </TooltipProvider>,
  );

describe("TimezoneSection", () => {
  beforeEach(() => mutateAsync.mockClear());

  it("reads as following the agent and names the agent's zone when unset", () => {
    withConversation({
      timezone: null,
      chatbot: { timezone: "Asia/Ho_Chi_Minh" },
    });
    renderSection();

    expect(
      screen.getByRole("button", {
        name: "conversations.customer.panel.timezone.title",
      }),
    ).toHaveTextContent("conversations.customer.panel.timezone.followAgent");
    expect(
      screen.getByLabelText(
        "conversations.customer.panel.timezone.hintWithZone:Asia/Ho_Chi_Minh",
      ),
    ).toBeInTheDocument();
  });

  it("shows the conversation's own zone and clears it back to the agent", async () => {
    withConversation({ timezone: "America/New_York", chatbot: {} });
    renderSection();

    const trigger = screen.getByRole("button", {
      name: "conversations.customer.panel.timezone.title",
    });
    expect(trigger).toHaveTextContent("America/New_York");

    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByText(
        "conversations.customer.panel.timezone.followAgent",
      ),
    );

    expect(mutateAsync).toHaveBeenCalledWith(null);
  });
});
