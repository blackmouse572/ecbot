import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConversationsCell } from "./conversations-cell";

vi.mock("@/components/platform-icon/platform-icon", () => ({
  PlatformIcon: ({ type }: { type: string }) => (
    <span data-testid="platform-icon">{type}</span>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
  }),
}));

describe("ConversationsCell", () => {
  it("stacks one logo per channel next to the conversation count", () => {
    render(
      <ConversationsCell
        conversationCount={3}
        channels={["FACEBOOK_PAGE", "ZALO_PAGE"]}
      />,
    );

    expect(
      screen.getAllByTestId("platform-icon").map((el) => el.textContent),
    ).toEqual(["FACEBOOK_PAGE", "ZALO_PAGE"]);
    expect(
      screen.getByText("customers.list.conversationCount:3"),
    ).toBeVisible();
  });

  it("shows one logo when two account types share a platform", () => {
    render(
      <ConversationsCell
        conversationCount={2}
        channels={["FACEBOOK_ACCOUNT", "FACEBOOK_PAGE"]}
      />,
    );

    expect(screen.getAllByTestId("platform-icon")).toHaveLength(1);
  });

  it("caps the stack at four logos and counts the rest", () => {
    render(
      <ConversationsCell
        conversationCount={9}
        channels={[
          "FACEBOOK_PAGE",
          "ZALO_PAGE",
          "INSTAGRAM_PAGE",
          "TELEGRAM_BOT",
          "TIKTOK_SHOP",
          "SHOPEE_SHOP",
        ]}
      />,
    );

    expect(screen.getAllByTestId("platform-icon")).toHaveLength(4);
    expect(screen.getByText("+2")).toBeVisible();
  });

  it("falls back to a placeholder for a customer without conversations", () => {
    render(<ConversationsCell conversationCount={0} channels={[]} />);

    expect(screen.queryByTestId("platform-icon")).not.toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
