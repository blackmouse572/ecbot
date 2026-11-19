import { render, screen } from "@testing-library/react";
import "@/i18n";
import { describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({
  data: {} as { bot?: { byChatbot: unknown[] } },
  isLoading: false,
}));

vi.mock("@/hooks/api/workspace-analytics", () => ({
  useWorkspaceAnalytics: () => analytics,
}));

import { ChatbotStatsSection } from "./chatbot-stats-section";

describe("ChatbotStatsSection", () => {
  it("shows the agent's last 7 days", () => {
    analytics.data = {
      bot: {
        byChatbot: [
          {
            id: "bot-1",
            conversations: 1284,
            botResolvedRate: 86,
            handoffRate: 9,
          },
        ],
      },
    };
    render(<ChatbotStatsSection chatbotId="bot-1" />);

    expect(screen.getByText("1,284")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText("9%")).toBeInTheDocument();
  });

  it("counts an agent with no conversations as zero", () => {
    analytics.data = { bot: { byChatbot: [] } };
    render(<ChatbotStatsSection chatbotId="bot-1" />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getAllByText("0%")).toHaveLength(2);
  });
});
