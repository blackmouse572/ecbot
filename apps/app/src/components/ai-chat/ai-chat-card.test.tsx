import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AIChatCard } from "./ai-chat-card";
import type { ChatTransportConfig } from "./use-ai-chat-stream";

const chat = vi.hoisted(() => ({ messages: [] as unknown[] }));

vi.mock("./use-ai-chat-stream", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./use-ai-chat-stream")>()),
  useAiChat: () => ({
    messages: chat.messages,
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

// #204: operators see every source that fed the answer, by name; customers
// (the widget) never see uploaded files or text items.
describe("AIChatCard sources", () => {
  const answer = {
    id: "m1",
    role: "assistant",
    parts: [{ type: "text", text: "Đổi trả trong 7 ngày." }],
    metadata: {
      sources: [
        {
          id: "KB-1",
          title: "Chính sách đổi trả",
          filename: "1790661848627-doi-tra.docx",
          source_url: null,
        },
      ],
    },
  };

  it("lists every source by title in Test chat", () => {
    chat.messages = [answer];
    render(
      <AIChatCard
        chatbotId="bot-1"
        transport={transport}
        showKnowledgeSources
      />,
    );

    expect(screen.getByText("KB-1 · Chính sách đổi trả")).toBeInTheDocument();
    expect(screen.queryByText(/1790661848627/)).not.toBeInTheDocument();
  });

  it("shows no uploaded-file source to customers", () => {
    chat.messages = [answer];
    render(<AIChatCard chatbotId="bot-1" transport={transport} />);

    expect(screen.queryByText(/Chính sách đổi trả/)).not.toBeInTheDocument();
  });
});
