import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationList } from "./conversation-list";

const state = vi.hoisted(() => ({
  marketing: false,
  canReadCustomers: true,
  useConversations: vi.fn(),
}));
vi.mock("@/hooks/api/conversations", () => ({
  useConversations: (query: unknown) => {
    state.useConversations(query);
    return {
      conversations: [],
      refetch: vi.fn(),
      isRefetching: false,
      isLoading: false,
      isError: false,
    };
  },
}));
vi.mock("@/hooks/api/feature-flags", () => ({
  useFeatureFlags: () => ({
    flags: {
      orders: false,
      customerSources: false,
      marketing: state.marketing,
    },
  }),
}));
vi.mock("@repo/auth", () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      action === "read" && subject === "CUSTOMER" && state.canReadCustomers,
  }),
}));
vi.mock("@/hooks/api/chatbot", () => ({
  useChatbots: () => ({ chatbots: [] }),
}));
vi.mock("@/hooks/api/accounts", () => ({
  useAccounts: () => ({ accounts: [] }),
}));
vi.mock("@/hooks/api/customer-merge-suggestions", () => ({
  usePendingMergeCustomerIds: () => ({ customerIds: new Set() }),
}));
vi.mock("@/hooks/api/workspace", () => ({
  useWorkspace: () => ({ workspace: { slug: "lumi" } }),
}));
vi.mock("./conversation-list-filters", () => ({
  CONVERSATION_FILTER_PREFIX: "conv",
  ConversationListFilters: () => null,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ConversationList />
    </MemoryRouter>,
  );

const lastQuery = () => state.useConversations.mock.calls.at(-1)?.[0];

describe("ConversationList filters", () => {
  beforeEach(() => {
    state.marketing = false;
    state.canReadCustomers = true;
    state.useConversations.mockClear();
  });

  it("sends the picked tags", () => {
    renderAt("/lumi/conversations?conv_tag=tag-1,tag-2");
    expect(lastQuery()).toMatchObject({ tag: "tag-1,tag-2" });
  });

  it("sends the stage while Marketing is on", () => {
    state.marketing = true;
    renderAt("/lumi/conversations?conv_stage=ASKED_PRICE");
    expect(lastQuery()).toMatchObject({ stage: "ASKED_PRICE" });
  });

  it("drops a stage in the URL while Marketing is off", () => {
    renderAt("/lumi/conversations?conv_stage=ASKED_PRICE");
    expect(lastQuery().stage).toBeUndefined();
  });

  it("drops tag and stage for a role that cannot read customers", () => {
    state.marketing = true;
    state.canReadCustomers = false;
    renderAt("/lumi/conversations?conv_tag=tag-1&conv_stage=ASKED_PRICE");
    expect(lastQuery().tag).toBeUndefined();
    expect(lastQuery().stage).toBeUndefined();
  });
});
