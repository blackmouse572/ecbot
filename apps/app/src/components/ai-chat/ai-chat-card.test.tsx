import "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AIChatCard } from "./ai-chat-card";
import type { ChatTransportConfig } from "./use-ai-chat-stream";

const chat = vi.hoisted(() => ({
  messages: [] as unknown[],
  status: "ready" as string,
}));

vi.mock("./use-ai-chat-stream", async () => ({
  ...(await vi.importActual<typeof import("./use-ai-chat-stream")>(
    "./use-ai-chat-stream",
  )),
  useAiChat: () => ({
    messages: chat.messages,
    status: chat.status,
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

describe("AIChatCard turn", () => {
  it("keeps the reply's loader under the tool trace while the agent calls tools", () => {
    chat.status = "streaming";
    chat.messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Where is my order?" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-get_order",
            toolCallId: "r1",
            state: "input-available",
            input: { id: 7 },
          },
          {
            type: "data-tool-meta",
            id: "r1",
            data: { kind: "mcp", label: "Shopify" },
          },
        ],
      },
    ];
    render(
      <TooltipProvider>
        <AIChatCard chatbotId="bot-1" transport={transport} />
      </TooltipProvider>,
    );
    expect(
      screen.getByRole("button", { name: /Calling get_order/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Generating response...")).toBeInTheDocument();
    chat.status = "ready";
    chat.messages = [];
  });
});

describe("AIChatCard for a customer", () => {
  it("shows the customer the reply only, never how the agent got there", () => {
    chat.status = "ready";
    chat.messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Còn hàng không?" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "data-knowledge", data: { count: 2 } },
          { type: "reasoning", text: "checking stock" },
          {
            type: "tool-get_stock",
            toolCallId: "r1",
            state: "output-available",
            input: {},
            output: { internal_note: "VIP" },
          },
          { type: "data-tool-meta", id: "r1", data: { kind: "mcp" } },
          { type: "text", text: "Còn hàng ạ" },
          {
            type: "source-url",
            sourceId: "KB-1",
            url: "https://shop/faq",
            title: "faq",
          },
        ],
      },
    ];
    render(
      <TooltipProvider>
        <AIChatCard
          chatbotId="bot-1"
          transport={transport}
          audience="customer"
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("Còn hàng ạ")).toBeInTheDocument();
    expect(screen.queryByText(/get_stock/)).not.toBeInTheDocument();
    expect(screen.queryByText(/checking stock/)).not.toBeInTheDocument();
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { expanded: true }),
    ).not.toBeInTheDocument();
    chat.messages = [];
  });
});
