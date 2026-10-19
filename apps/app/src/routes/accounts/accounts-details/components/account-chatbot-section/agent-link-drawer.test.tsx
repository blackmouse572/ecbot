import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  search: undefined as string | undefined,
  fetchNextPage: vi.fn(),
  hasNextPage: true,
  observed: [] as Element[],
  trigger: undefined as undefined | (() => void),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/routes/chatbot/constants", () => ({
  CHATBOT_TYPE_CONFIG: { restaurant: {} },
}));
vi.mock("@/hooks/api/chatbot", () => ({
  useInfiniteChatbotList: (search: string) => {
    state.search = search;
    return {
      chatbots: [{ id: "a", name: "Moc", type: "restaurant" }],
      fetchNextPage: state.fetchNextPage,
      hasNextPage: state.hasNextPage,
      isFetchingNextPage: false,
    };
  },
  useLinkChatbotAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock(
  "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-badge",
  () => ({
    ChatbotTypeBadge: () => <span>type-badge</span>,
  }),
);
vi.mock(
  "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell",
  () => ({
    ChatbotNameCell: ({ name }: { name: string }) => <span>{name}</span>,
  }),
);

import { AgentLinkDrawer } from "./agent-link-drawer";

beforeEach(() => {
  state.search = undefined;
  state.fetchNextPage.mockReset();
  state.hasNextPage = true;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        state.trigger = () => cb([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

describe("AgentLinkDrawer", () => {
  it("searches agents on the server", async () => {
    render(<AgentLinkDrawer isOpen onClose={vi.fn()} accountId="acc-1" />);

    fireEvent.change(screen.getByPlaceholderText("app.search.label"), {
      target: { value: "mo" },
    });

    await waitFor(() => expect(state.search).toBe("mo"));
  });

  it("loads the next page when the end of the list is reached", () => {
    render(<AgentLinkDrawer isOpen onClose={vi.fn()} accountId="acc-1" />);

    state.trigger?.();

    expect(state.fetchNextPage).toHaveBeenCalled();
  });

  it("shows each agent's business type", () => {
    render(<AgentLinkDrawer isOpen onClose={vi.fn()} accountId="acc-1" />);

    expect(screen.getByText("type-badge")).toBeInTheDocument();
  });
});
