import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";

// `empty` has no agents or conversations yet; `busy` already has both.
const TOTALS = { empty: 0, busy: 7 } as const;
type Slug = keyof typeof TOTALS;

const current = vi.hoisted(() => ({ slug: "empty" }));

const page = (slug: Slug) => ({
  data: { data: [], _metadata: { pagination: { total: TOTALS[slug] } } },
});

vi.mock("@repo/client", () => ({
  conversationWorkspaceControllerListV1: vi.fn(async ({ path }: A) =>
    page(path.workspace),
  ),
  chatbotControllerFindAllV1: vi.fn(async ({ path }: A) =>
    page(path.workspace),
  ),
}));
vi.mock("./workspace", () => ({
  useWorkspace: () => ({
    workspace: { id: current.slug, slug: current.slug },
  }),
}));

import { useAccountChatbot, useChatbots } from "./chatbot";
import { useConversations } from "./conversations";

/** Every count a render returned once loaded, tagged with the workspace. */
const seen: { slug: string; hook: string; count: number }[] = [];

const Counts: FC = () => {
  const conversations = useConversations({ perPage: 1 });
  const chatbots = useChatbots({ perPage: 1 });
  const accountChatbot = useAccountChatbot("acc");
  const hooks = { conversations, chatbots, accountChatbot };
  for (const [hook, q] of Object.entries(hooks)) {
    if (!q.isLoading && !q.isError && q.data !== undefined)
      seen.push({ slug: current.slug, hook, count: q.count ?? 0 });
  }
  return <p>{`${conversations.count}-${chatbots.count}`}</p>;
};

describe("switching workspace keeps list counts per workspace", () => {
  // The first-conversation popup armed itself in a workspace that already
  // had conversations, because it read the previous workspace's cached 0.
  it("never returns the previous workspace's count for the new one", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <QueryClientProvider client={client}>
        <Counts />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("0-0")).toBeTruthy();

    current.slug = "busy";
    await act(async () =>
      view.rerender(
        <QueryClientProvider client={client}>
          <Counts />
        </QueryClientProvider>,
      ),
    );
    expect(await screen.findByText("7-7")).toBeTruthy();

    const leaked = seen.filter((s) => s.slug === "busy" && s.count === 0);
    expect(leaked).toEqual([]);
  });
});
