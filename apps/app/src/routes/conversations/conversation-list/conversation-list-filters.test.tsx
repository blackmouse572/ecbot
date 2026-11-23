import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Filter } from "@/components/table/data-table/data-table-filter/data-table-filter";
import { ConversationListFilters } from "./conversation-list-filters";

const state = vi.hoisted(() => ({
  marketing: false,
  canReadCustomers: true,
  filters: [] as Filter[],
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
vi.mock("@/hooks/api/customer-tags", () => ({
  useCustomerTagList: () => ({
    tags: [
      { id: "tag-vip", name: "VIP", emoji: "⭐" },
      { id: "tag-west", name: "Tây", emoji: null },
    ],
  }),
}));
vi.mock(
  "@/components/table/data-table/data-table-filter/data-table-filter",
  () => ({
    DataTableFilter: ({ filters }: { filters: Filter[] }) => {
      state.filters = filters;
      return null;
    },
  }),
);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderFilters = () =>
  render(
    <ConversationListFilters
      search=""
      onSearchChange={() => {}}
      chatbots={[]}
      accounts={[]}
    />,
  );

const byKey = (key: string) => state.filters.find((f) => f.key === key);

describe("ConversationListFilters", () => {
  beforeEach(() => {
    state.marketing = false;
    state.canReadCustomers = true;
    state.filters = [];
  });

  it("offers the customer tags, several at once", () => {
    renderFilters();
    const tag = byKey("tag");
    expect(tag).toMatchObject({
      label: "conversations.list.filter.tag",
      type: "select",
      multiple: true,
      searchable: true,
      options: [
        { value: "tag-vip", label: "⭐ VIP" },
        { value: "tag-west", label: "Tây" },
      ],
    });
  });

  it("hides the stage filter while the marketing flag is off", () => {
    renderFilters();
    expect(byKey("stage")).toBeUndefined();
  });

  it("offers the journey stages while the marketing flag is on", () => {
    state.marketing = true;
    renderFilters();
    expect(byKey("stage")).toMatchObject({
      label: "conversations.list.filter.stage",
      multiple: true,
    });
    expect(
      (byKey("stage") as { options: { value: string }[] }).options.map(
        (o) => o.value,
      ),
    ).toEqual([
      "NEW",
      "INTERESTED",
      "ASKED_PRICE",
      "BOUGHT_ONCE",
      "BOUGHT_REPEAT",
    ]);
  });

  it("hides tag and stage for a role that cannot read customers", () => {
    state.marketing = true;
    state.canReadCustomers = false;
    renderFilters();
    expect(byKey("tag")).toBeUndefined();
    expect(byKey("stage")).toBeUndefined();
  });
});
