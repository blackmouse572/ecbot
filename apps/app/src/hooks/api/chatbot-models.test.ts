import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/client", () => ({
  chatbotControllerModelsV1: vi.fn(async () => ({
    data: {
      data: [
        {
          id: "anthropic/claude-sonnet-4.5",
          name: "Claude Sonnet 4.5",
          provider: "anthropic",
          contextLength: 200000,
        },
      ],
    },
  })),
}));

vi.mock("./workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "w" } }),
}));

import { useChatbotModels } from "./chatbot";

const wrapper = ({ children }: PropsWithChildren) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
};

describe("useChatbotModels", () => {
  it("returns the model catalog for the active workspace", async () => {
    const { result } = renderHook(() => useChatbotModels(), { wrapper });

    await waitFor(() => expect(result.current.models.length).toBe(1));

    expect(result.current.models[0].id).toBe("anthropic/claude-sonnet-4.5");
  });
});
