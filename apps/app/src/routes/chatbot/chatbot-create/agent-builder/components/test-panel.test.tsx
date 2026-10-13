// Real react-i18next + en.json (imported for its init side effect), unlike
// agent-builder.test.tsx's raw-key mock: this file specifically proves the
// interpolated "Talk with {{name}}" text, not just that the right key fired.
import i18n from "@/i18n";
import { createProfile } from "@repo/agent-blueprint";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TestPanel } from "./test-panel";

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));
vi.mock("@/modules/auth", () => ({ useAuthToken: () => "token" }));
vi.mock("@/components/ai-chat/use-ai-chat-stream", () => ({
  workspaceChatTransport: () => ({}),
}));
vi.mock("@/components/ai-chat/ai-chat-card", () => ({
  AIChatCard: ({ heading }: { heading?: string }) => <div data-testid="ai-chat-card">{heading}</div>,
}));
vi.mock("@/components/ai-chat/ai-chat-input", () => ({ AIChatInput: () => null }));

const profile = createProfile("beauty", "en");

describe("TestPanel", () => {
  it('reads "Talk with {agentName}" on the tab and the chat heading once the agent has a name', () => {
    render(
      <TestPanel
        chatbotId="bot-1"
        profile={{ ...profile, agentName: "Linh" }}
        extraInstructions=""
        agentDisplayName="Linh"
      />,
    );
    expect(screen.getByRole("tab", { name: "Talk with Linh" })).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-card")).toHaveTextContent("Talk with Linh");
  });

  it('falls back to "Talk with your agent" before the agent has a name', () => {
    render(<TestPanel chatbotId="bot-1" profile={null} extraInstructions="" agentDisplayName="your agent" />);
    expect(screen.getByRole("tab", { name: "Talk with your agent" })).toBeInTheDocument();
  });

  it("truncates a long agent name and keeps the full label available as a title", () => {
    const longName = "A".repeat(80);
    render(
      <TestPanel
        chatbotId="bot-1"
        profile={{ ...profile, agentName: longName }}
        extraInstructions=""
        agentDisplayName={longName}
      />,
    );
    const tab = screen.getByRole("tab", { name: `Talk with ${longName}` });
    expect(tab.querySelector(".truncate")).toBeInTheDocument();
    expect(tab).toHaveAttribute("title", `Talk with ${longName}`);
  });

  // #159: a non-technical owner got only the compiled English prompt.
  describe("Prompt tab", () => {
    const openPromptTab = () => {
      render(
        <TestPanel
          chatbotId="bot-1"
          profile={{ ...profile, businessName: "Hoa Nail", agentName: "Linh", emoji: true }}
          extraInstructions="Always offer the Tuesday discount."
          agentDisplayName="Linh"
        />,
      );
      fireEvent.mouseDown(screen.getByRole("tab", { name: "Prompt" }));
    };

    it("summarizes the answers in the owner's language", () => {
      openPromptTab();
      expect(screen.getByText("Hoa Nail")).toBeInTheDocument();
      expect(screen.getByText("Linh")).toBeInTheDocument();
      expect(screen.getByText("Always offer the Tuesday discount.")).toBeInTheDocument();
    });

    it("labels the summary in Vietnamese for a Vietnamese owner", async () => {
      await i18n.changeLanguage("vi");
      try {
        openPromptTab();
        // A translated question title, a choice by its label, and a yes/no.
        expect(screen.getByText("Tên doanh nghiệp của bạn là gì?")).toBeInTheDocument();
        expect(screen.getByText("Vừa phải")).toBeInTheDocument();
        expect(screen.getByText("Agent có dùng emoji không?").closest("div")).toHaveTextContent("Có");
      } finally {
        await i18n.changeLanguage("en");
      }
    });

    it("keeps the compiled prompt behind a toggle", () => {
      openPromptTab();
      expect(screen.queryByText(/Initialization/)).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Show the full prompt (English)" }));

      expect(screen.getByRole("button", { name: "Hide the full prompt" })).toBeInTheDocument();
      expect(screen.getAllByText(/Hoa Nail/).length).toBeGreaterThan(1);
    });
  });
});
