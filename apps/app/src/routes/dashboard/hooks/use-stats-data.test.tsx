import "@/i18n";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStatsData } from "./use-stats-data";

const counts = vi.hoisted(() => ({
  chatbots: { count: 0, isLoading: false, isError: false },
  accounts: { count: 0, isLoading: false, isError: false },
  conversations: { count: 0, isLoading: false, isError: false },
}));

vi.mock("@/hooks/api/chatbot", () => ({ useChatbots: () => counts.chatbots }));
vi.mock("@/hooks/api/accounts", () => ({ useAccounts: () => counts.accounts }));
vi.mock("@/hooks/api/conversations", () => ({
  useConversations: () => counts.conversations,
}));

describe("useStatsData", () => {
  beforeEach(() => {
    counts.chatbots = { count: 0, isLoading: false, isError: false };
    counts.accounts = { count: 0, isLoading: false, isError: false };
    counts.conversations = { count: 0, isLoading: false, isError: false };
  });

  it("shows zeros for an empty workspace, with no made-up trend", () => {
    const { result } = renderHook(() => useStatsData());
    expect(result.current.map((s) => s.value)).toEqual([0, 0, 0]);
    expect(result.current.every((s) => s.trend === undefined)).toBe(true);
  });

  it("shows the workspace's real counts", () => {
    counts.chatbots.count = 2;
    counts.accounts.count = 1;
    counts.conversations.count = 14;
    const { result } = renderHook(() => useStatsData());
    expect(result.current.map((s) => s.value)).toEqual([2, 1, 14]);
  });

  it("shows a dash while a count is loading or failed", () => {
    counts.chatbots.isLoading = true;
    counts.accounts.isError = true;
    const { result } = renderHook(() => useStatsData());
    expect(result.current.map((s) => s.value)).toEqual(["-", "-", 0]);
  });
});
