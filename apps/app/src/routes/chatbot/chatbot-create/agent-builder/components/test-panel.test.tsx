// Real react-i18next + en.json (imported for its init side effect), unlike
// agent-builder.test.tsx's raw-key mock: this file specifically proves the
// interpolated "Talk with {{name}}" text, not just that the right key fired.
import "@/i18n";
import { createProfile } from "@repo/agent-blueprint";
import { render, screen } from "@testing-library/react";
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
    render(<TestPanel chatbotId={null} profile={null} extraInstructions="" agentDisplayName="your agent" />);
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
});
