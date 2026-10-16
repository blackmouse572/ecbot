import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { conversationSidebarOpenAtom } from "../state";
import { ConversationDetailSkeleton } from "./conversation-detail-skeleton";

const renderWith = (open: boolean) => {
  const store = createStore();
  store.set(conversationSidebarOpenAtom, open);
  render(
    <Provider store={store}>
      <ConversationDetailSkeleton />
    </Provider>,
  );
};

describe("ConversationDetailSkeleton", () => {
  it("holds the open customer panel's place so the layout doesn't jump", () => {
    renderWith(true);
    expect(screen.getByTestId("customer-panel-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("customer-rail-skeleton")).toBeNull();
  });

  it("holds the thin rail's place when the operator collapsed the panel", () => {
    renderWith(false);
    expect(screen.getByTestId("customer-rail-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("customer-panel-skeleton")).toBeNull();
  });
});
