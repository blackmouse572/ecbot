import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({
  prev: undefined as unknown,
  formProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/components/modals/route-focus-modal", () => ({
  RouteFocusModal: ({
    prev,
    children,
  }: {
    prev?: string;
    children: ReactNode;
  }) => {
    seen.prev = prev;
    return <>{children}</>;
  },
}));

vi.mock("./components", () => ({
  KnowledgeItemCreateForm: (props: Record<string, unknown>) => {
    seen.formProps = props;
    return null;
  },
}));

import { KnowledgeItemCreate } from "./knowledge-item-create";

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/:workspaceSlug/knowledge-base/:knowledgeBaseId/item/create"
          element={<KnowledgeItemCreate />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("KnowledgeItemCreate", () => {
  beforeEach(() => {
    seen.prev = undefined;
    seen.formProps = undefined;
  });

  // #283: opened from an agent, the agent is pre-ticked and closing the
  // modal lands back on that agent.
  it("pre-ticks the agent it was opened from and returns there", () => {
    renderAt("/ws/knowledge-base/kb-1/item/create?agent=bot-1");

    expect(seen.formProps).toMatchObject({
      knowledgeBaseId: "kb-1",
      defaultChatbotIds: ["bot-1"],
    });
    expect(seen.prev).toBe("/ws/chatbot/bot-1");
  });

  it("keeps the knowledge base as the destination without an agent", () => {
    renderAt("/ws/knowledge-base/kb-1/item/create");

    expect(seen.formProps?.defaultChatbotIds).toBeUndefined();
    expect(seen.prev).toBe("/ws/knowledge-base");
  });
});
