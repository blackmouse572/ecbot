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
    // A public web page the answer used is still linked (#204).
    expect(screen.getByText("KB-1 · faq")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { expanded: true }),
    ).not.toBeInTheDocument();
    chat.messages = [];
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
