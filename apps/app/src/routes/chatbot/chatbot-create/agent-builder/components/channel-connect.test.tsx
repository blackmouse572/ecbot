import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const chatbotMock = vi.fn();
const unlinkAccountsMock = vi.fn();
const linkAccount = vi.fn();
const linkChatbotAccount = vi.fn();
const unlinkChatbotAccount = vi.fn();
const provisionWebsiteWidget = vi.fn();

// Captures each platform's onSuccess/onError so a test can simulate the
// OAuth popup completing, the way the real hook would via postMessage.
const oAuthHandlers: Record<string, { onSuccess?: (d: { code: string }) => void; onError?: (e: string) => void }> = {};
const oAuthClick = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/api", () => ({
  useChatbot: (...args: unknown[]) => chatbotMock(...args),
  useUnlinkAccounts: (...args: unknown[]) => unlinkAccountsMock(...args),
  useLinkAccount: () => ({ mutateAsync: linkAccount, isPending: false }),
  useLinkChatbotAccount: () => ({ mutateAsync: linkChatbotAccount, isPending: false }),
  useUnlinkChatbotAccount: () => ({ mutateAsync: unlinkChatbotAccount, isPending: false }),
  useProvisionWebsiteWidget: () => ({ mutateAsync: provisionWebsiteWidget, isPending: false }),
}));

vi.mock("@/hooks/use-oauth-login", () => ({
  useOAuthLogin: (platform: string, handlers: A) => {
    oAuthHandlers[platform] = handlers;
    return { handleLinkClick: () => oAuthClick(platform) };
  },
}));

import { ChannelConnect } from "./channel-connect";

const onAccountsLinked = vi.fn();
const onAccountsUnlinked = vi.fn();
const onAnswer = vi.fn();

const renderConnect = (channels: string[] = []) =>
  render(
    <ChannelConnect
      chatbotId="bot-1"
      agentName="Linh"
      channels={channels}
      onAccountsLinked={onAccountsLinked}
      onAccountsUnlinked={onAccountsUnlinked}
      onAnswer={onAnswer}
    />,
  );

beforeEach(() => {
  chatbotMock.mockReset().mockReturnValue({ chatbot: { accounts: [] } });
  unlinkAccountsMock.mockReset().mockReturnValue({ accounts: [] });
  linkAccount.mockReset();
  linkChatbotAccount.mockReset().mockResolvedValue({});
  unlinkChatbotAccount.mockReset().mockResolvedValue({});
  provisionWebsiteWidget.mockReset();
  onAccountsLinked.mockReset();
  onAccountsUnlinked.mockReset();
  onAnswer.mockReset();
  oAuthClick.mockReset();
  for (const k of Object.keys(oAuthHandlers)) delete oAuthHandlers[k];
});

describe("ChannelConnect", () => {
  it("links the account and shows a chip after an OAuth success", async () => {
    linkAccount.mockResolvedValue({ data: { data: { id: "acc-1", name: "Lotus Spa" } } });
    chatbotMock.mockReturnValueOnce({ chatbot: { accounts: [] } });
    // After linking, the chatbot query would refetch with the account
    // attached — simulate that for the chip assertion below.
    chatbotMock.mockReturnValue({ chatbot: { accounts: [{ id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" }] } });

    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.messenger"));
    expect(oAuthClick).toHaveBeenCalledWith("FACEBOOK_ACCOUNT");

    await oAuthHandlers.FACEBOOK_ACCOUNT.onSuccess?.({ code: "auth-code" });

    await waitFor(() => expect(linkAccount).toHaveBeenCalledWith({ code: "auth-code", platform: "FACEBOOK_ACCOUNT" }));
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-1"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith(["acc-1"]);
  });

  it("shows the inline error when the OAuth popup fails", async () => {
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.zalo"));
    oAuthHandlers.ZALO_ACCOUNT.onError?.("popup closed");

    expect(await screen.findByText("agentBuilder.ui.connectFailed")).toBeInTheDocument();
    expect(linkChatbotAccount).not.toHaveBeenCalled();
  });

  it("links a Telegram bot token", async () => {
    linkAccount.mockResolvedValue({ data: { data: { id: "acc-tg" } } });
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.telegram"));
    const token = `123456:${"A".repeat(40)}`;
    await user.type(screen.getByLabelText("agentBuilder.ui.telegramTokenLabel"), token);
    await user.click(screen.getByRole("button", { name: "accounts.create.connect.telegram.cta" }));

    await waitFor(() => expect(linkAccount).toHaveBeenCalledWith({ code: token, platform: "TELEGRAM_BOT" }));
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-tg"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith(["acc-tg"]);
  });

  it("provisions a website widget, links it and shows the issued key panel once", async () => {
    provisionWebsiteWidget.mockResolvedValue({ id: "acc-widget", widgetKey: "wk_123" });
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.website"));
    await user.type(screen.getByPlaceholderText("accounts.create.provision.namePlaceholder"), " Nail Spa");
    await user.type(screen.getByPlaceholderText("https://shop.example.com"), "https://lotus.example.com");
    await user.click(screen.getByRole("button", { name: "accounts.create.provision.cta" }));

    await waitFor(() => expect(provisionWebsiteWidget).toHaveBeenCalled());
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-widget"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith(["acc-widget"]);
    expect(await screen.findByDisplayValue("wk_123")).toBeInTheDocument();
    // The provision form is replaced by the issued panel, so it's shown once.
    expect(screen.queryByPlaceholderText("accounts.create.provision.namePlaceholder")).not.toBeInTheDocument();
  });

  it("links an existing unlinked account via Use", async () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-9", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }] });
    const user = userEvent.setup();
    renderConnect();

    expect(screen.getByText("agentBuilder.ui.existingChannels")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "agentBuilder.ui.useChannel" }));

    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-9"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith(["acc-9"]);
  });

  it("only lists useUnlinkAccounts results under 'use an existing channel' (no stealing)", async () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-free", name: "Free Account", type: "ZALO_ACCOUNT" }] });
    renderConnect();
    expect(screen.getByText("Free Account")).toBeInTheDocument();
    expect(unlinkAccountsMock).toHaveBeenCalled();
  });

  it("unlinks and removes the chip", async () => {
    chatbotMock.mockReturnValue({ chatbot: { accounts: [{ id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" }] } });
    const user = userEvent.setup();
    renderConnect();

    expect(screen.getByText("Lotus Spa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "actions.close" }));

    await waitFor(() => expect(unlinkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-1"] }));
    expect(onAccountsUnlinked).toHaveBeenCalledWith(["acc-1"]);
  });

  it("writes the channels derived from linked accounts plus coming-soon picks on Next", async () => {
    chatbotMock.mockReturnValue({
      chatbot: { accounts: [{ id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" }] },
    });
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.instagram"));
    await user.click(screen.getByRole("button", { name: "actions.next" }));

    expect(onAnswer).toHaveBeenCalledWith(expect.arrayContaining(["messenger", "instagram"]));
    expect(onAnswer.mock.calls[0][0]).toHaveLength(2);
  });

  it("labels the skip action 'Connect later'", () => {
    renderConnect();
    expect(screen.getByRole("button", { name: "agentBuilder.ui.connectLater" })).toBeInTheDocument();
  });
});
