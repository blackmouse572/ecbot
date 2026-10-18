import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "ws" }),
}));
vi.mock("@/hooks/api/chatbot", () => ({
  useUnlinkChatbotAccount: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("./account-link-drawer", () => ({ AccountLinkDrawer: () => null }));

import { AccountList } from "./account-list";

describe("AccountList", () => {
  it("offers to connect a channel when the agent has none", () => {
    render(
      <MemoryRouter>
        <AccountList item={{ id: "bot-1" } as never} accounts={[]} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "actions.connectChannel" }),
    ).toHaveAttribute("href", "/ws/accounts/create");
  });
});
