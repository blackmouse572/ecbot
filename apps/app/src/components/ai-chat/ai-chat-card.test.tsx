import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AIChatCard } from "./ai-chat-card";
import type { ChatTransportConfig } from "./use-ai-chat-stream";

vi.mock("./use-ai-chat-stream", () => ({
  useAiChat: () => ({
    messages: [],
    status: "ready",
    error: undefined,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    setMessages: vi.fn(),
  }),
}));

const transport: ChatTransportConfig = {
  path: "/api/v1/chatbots/bot-1/stream",
  includeCredentials: true,
  invalidateToolInvocations: false,
};

describe("AIChatCard heading", () => {
  it("truncates a long heading and keeps the full text available as a title, without letting the row squeeze the actions", () => {
    const heading = `Talk with ${"A".repeat(80)}`;
    render(
      <AIChatCard chatbotId="bot-1" transport={transport} heading={heading} />,
    );
    const headingEl = screen.getByText(heading);
    expect(headingEl).toHaveClass("truncate");
    expect(headingEl).toHaveAttribute("title", heading);
  });
});
