import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const unlinkAccountsMock = vi.fn();
const fetchUnlinkedAccounts = vi.fn();
const linkAccount = vi.fn();
const linkChatbotAccount = vi.fn();
const unlinkChatbotAccount = vi.fn();
const provisionWebsiteWidget = vi.fn();

// Captures each platform's onSuccess/onError/onClosed so a test can
// simulate the OAuth popup completing, the way the real hook would via
// postMessage (or the popup closing/being blocked).
type OAuthHandlers = { onSuccess?: (d: { code: string }) => void; onError?: (e: string) => void; onClosed?: () => void };
const oAuthHandlers: Record<string, OAuthHandlers> = {};
const oAuthClick = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: { name?: string }) => (opts?.name ? `${key} ${opts.name}` : key) }),
}));

vi.mock("@/hooks/api", () => ({
  useUnlinkAccounts: (...args: unknown[]) => unlinkAccountsMock(...args),
  useFetchUnlinkedAccounts: () => fetchUnlinkedAccounts,
  useLinkAccount: () => ({ mutateAsync: linkAccount, isPending: false }),
  useLinkChatbotAccount: () => ({ mutateAsync: linkChatbotAccount, isPending: false }),
  useUnlinkChatbotAccount: () => ({ mutateAsync: unlinkChatbotAccount, isPending: false }),
  useProvisionWebsiteWidget: () => ({ mutateAsync: provisionWebsiteWidget, isPending: false }),
}));

vi.mock("@/hooks/use-oauth-login", () => ({
  useOAuthLogin: (platform: string, handlers: OAuthHandlers) => {
    oAuthHandlers[platform] = handlers;
    return { handleLinkClick: () => oAuthClick(platform) };
  },
}));

import type { LinkedAccountRef } from "../builder-state";
import { ChannelConnect } from "./channel-connect";

const onAccountsLinked = vi.fn();
const onAccountsUnlinked = vi.fn();
const onAnswer = vi.fn();
const beginAccountsChange = vi.fn();
const endAccountsChange = vi.fn();
const waitForPendingSave = vi.fn();

const renderConnect = (channels: string[] = [], linkedAccounts: LinkedAccountRef[] = []) =>
  render(
    <ChannelConnect
      chatbotId="bot-1"
      agentName="Linh"
      channels={channels}
      linkedAccounts={linkedAccounts}
      onAccountsLinked={onAccountsLinked}
      onAccountsUnlinked={onAccountsUnlinked}
      onAnswer={onAnswer}
      beginAccountsChange={beginAccountsChange}
      endAccountsChange={endAccountsChange}
      waitForPendingSave={waitForPendingSave}
    />,
  );

beforeEach(() => {
  unlinkAccountsMock.mockReset().mockReturnValue({ accounts: [] });
  fetchUnlinkedAccounts.mockReset().mockResolvedValue({ data: [] });
  linkAccount.mockReset();
  linkChatbotAccount.mockReset().mockResolvedValue({});
  unlinkChatbotAccount.mockReset().mockResolvedValue({});
  provisionWebsiteWidget.mockReset();
  onAccountsLinked.mockReset();
  onAccountsUnlinked.mockReset();
  onAnswer.mockReset();
  oAuthClick.mockReset();
  beginAccountsChange.mockReset();
  endAccountsChange.mockReset();
  waitForPendingSave.mockReset().mockResolvedValue(undefined);
  for (const k of Object.keys(oAuthHandlers)) delete oAuthHandlers[k];
});

describe("ChannelConnect", () => {
  it("links the account and shows a chip after an OAuth success", async () => {
    linkAccount.mockResolvedValue({ data: { data: { id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" } } });
    fetchUnlinkedAccounts.mockResolvedValue({ data: [{ id: "acc-1" }] });

    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.messenger"));
    expect(oAuthClick).toHaveBeenCalledWith("FACEBOOK_ACCOUNT");

    await oAuthHandlers.FACEBOOK_ACCOUNT.onSuccess?.({ code: "auth-code" });

    await waitFor(() => expect(linkAccount).toHaveBeenCalledWith({ code: "auth-code", platform: "FACEBOOK_ACCOUNT" }));
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-1"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith([{ id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" }]);
    expect(beginAccountsChange).toHaveBeenCalled();
    expect(endAccountsChange).toHaveBeenCalled();
  });

  it("links only the Facebook pages a response returns, never the user-level account", async () => {
    linkAccount.mockResolvedValue({
      data: {
        data: {
          id: "acc-user",
          name: "Owner",
          type: "FACEBOOK_ACCOUNT",
          pages: [{ id: "page-1", name: "Lotus Page", type: "FACEBOOK_PAGE" }],
        },
      },
    });
    fetchUnlinkedAccounts.mockResolvedValue({ data: [{ id: "page-1" }] });

    const user = userEvent.setup();
    renderConnect();
    await user.click(screen.getByText("agentBuilder.channels.messenger"));
    await oAuthHandlers.FACEBOOK_ACCOUNT.onSuccess?.({ code: "auth-code" });

    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["page-1"] }));
    expect(linkChatbotAccount).not.toHaveBeenCalledWith(expect.objectContaining({ accounts: expect.arrayContaining(["acc-user"]) }));
  });

  it("no stealing: does not link an id that belongs to another chatbot, and shows a notice", async () => {
    linkAccount.mockResolvedValue({ data: { data: { id: "acc-taken", name: "Taken Account", type: "ZALO_ACCOUNT" } } });
    // The fresh unlinked-accounts fetch does not contain acc-taken, meaning
    // some other chatbot already owns it.
    fetchUnlinkedAccounts.mockResolvedValue({ data: [] });

    const user = userEvent.setup();
    renderConnect();
    await user.click(screen.getByText("agentBuilder.channels.zalo"));
    await oAuthHandlers.ZALO_ACCOUNT.onSuccess?.({ code: "auth-code" });

    await waitFor(() => expect(fetchUnlinkedAccounts).toHaveBeenCalled());
    expect(linkChatbotAccount).not.toHaveBeenCalled();
    expect(onAccountsLinked).not.toHaveBeenCalled();
    expect(await screen.findByText("agentBuilder.ui.channelInUse Taken Account")).toBeInTheDocument();
  });

  it("shows the inline error when the OAuth popup errors", async () => {
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.zalo"));
    oAuthHandlers.ZALO_ACCOUNT.onError?.("popup closed");

    expect(await screen.findByText("agentBuilder.ui.connectFailed")).toBeInTheDocument();
    expect(linkChatbotAccount).not.toHaveBeenCalled();
    // Busy clears so the card can be retried.
    expect(screen.getByText("agentBuilder.channels.zalo").closest("button")).toBeEnabled();
  });

  it("shows the popup-blocked error too (window.open returning null reports onError)", async () => {
    const user = userEvent.setup();
    renderConnect();
    await user.click(screen.getByText("agentBuilder.channels.messenger"));
    oAuthHandlers.FACEBOOK_ACCOUNT.onError?.("popup-blocked");
    expect(await screen.findByText("agentBuilder.ui.connectFailed")).toBeInTheDocument();
  });

  it("clears busy without an error when the popup is closed manually", async () => {
    const user = userEvent.setup();
    renderConnect();
    await user.click(screen.getByText("agentBuilder.channels.messenger"));
    expect(screen.getByText("agentBuilder.channels.messenger").closest("button")).toBeDisabled();

    act(() => oAuthHandlers.FACEBOOK_ACCOUNT.onClosed?.());

    expect(screen.queryByText("agentBuilder.ui.connectFailed")).not.toBeInTheDocument();
    expect(screen.getByText("agentBuilder.channels.messenger").closest("button")).toBeEnabled();
  });

  it("disables the other OAuth card while one OAuth flow is pending", async () => {
    const user = userEvent.setup();
    renderConnect();
    await user.click(screen.getByText("agentBuilder.channels.messenger"));

    expect(screen.getByText("agentBuilder.channels.zalo").closest("button")).toBeDisabled();

    act(() => oAuthHandlers.FACEBOOK_ACCOUNT.onClosed?.());
    expect(screen.getByText("agentBuilder.channels.zalo").closest("button")).toBeEnabled();
  });

  it("links a Telegram bot token", async () => {
    linkAccount.mockResolvedValue({ data: { data: { id: "acc-tg", name: "Lotus Bot", type: "TELEGRAM_BOT" } } });
    fetchUnlinkedAccounts.mockResolvedValue({ data: [{ id: "acc-tg" }] });
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.telegram"));
    const token = `123456:${"A".repeat(40)}`;
    await user.type(screen.getByLabelText("agentBuilder.ui.telegramTokenLabel"), token);
    await user.click(screen.getByRole("button", { name: "accounts.create.connect.telegram.cta" }));

    await waitFor(() => expect(linkAccount).toHaveBeenCalledWith({ code: token, platform: "TELEGRAM_BOT" }));
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-tg"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith([{ id: "acc-tg", name: "Lotus Bot", type: "TELEGRAM_BOT" }]);
  });

  it("provisions a website widget, links it and shows the issued key panel once, then allows a second one", async () => {
    provisionWebsiteWidget.mockResolvedValue({ id: "acc-widget", widgetKey: "wk_123" });
    const user = userEvent.setup();
    renderConnect();

    await user.click(screen.getByText("agentBuilder.channels.website"));
    await user.type(screen.getByLabelText("accounts.create.provision.nameLabel"), " Nail Spa");
    await user.type(screen.getByLabelText("agentBuilder.ui.widgetOriginsLabel"), "https://lotus.example.com");
    await user.click(screen.getByRole("button", { name: "accounts.create.provision.cta" }));

    await waitFor(() => expect(provisionWebsiteWidget).toHaveBeenCalled());
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-widget"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith([{ id: "acc-widget", type: "WEBSITE_WIDGET", name: "Linh Nail Spa" }]);
    expect(await screen.findByDisplayValue("wk_123")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "actions.close" }));
    // Reopening the website card shows a fresh provision form, not the last
    // widget's issued panel again.
    await user.click(screen.getByText("agentBuilder.channels.website"));
    expect(screen.getByLabelText("accounts.create.provision.nameLabel")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("wk_123")).not.toBeInTheDocument();
  });

  it("links an existing unlinked account via Use", async () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-9", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }] });
    const user = userEvent.setup();
    renderConnect();

    expect(screen.getByText("agentBuilder.ui.existingChannels")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "agentBuilder.ui.useChannel" }));

    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-9"] }));
    expect(onAccountsLinked).toHaveBeenCalledWith([{ id: "acc-9", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }]);
  });

  it("only lists useUnlinkAccounts results under 'use an existing channel' (no stealing)", () => {
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-free", name: "Free Account", type: "ZALO_ACCOUNT" }] });
    renderConnect();
    expect(screen.getByText("Free Account")).toBeInTheDocument();
    expect(unlinkAccountsMock).toHaveBeenCalled();
  });

  it("unlinks and removes the chip", async () => {
    const user = userEvent.setup();
    renderConnect([], [{ id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" }]);

    expect(screen.getByText("Lotus Spa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "agentBuilder.ui.unlinkChannel Lotus Spa" }));

    await waitFor(() => expect(unlinkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-1"] }));
    expect(onAccountsUnlinked).toHaveBeenCalledWith(["acc-1"]);
  });

  it("writes the channels derived from linked accounts plus coming-soon picks on Next", async () => {
    const user = userEvent.setup();
    renderConnect([], [{ id: "acc-1", name: "Lotus Spa", type: "FACEBOOK_ACCOUNT" }]);

    await user.click(screen.getByText("agentBuilder.channels.instagram"));
    await user.click(screen.getByRole("button", { name: "actions.next" }));

    expect(onAnswer).toHaveBeenCalledWith(expect.arrayContaining(["messenger", "instagram"]));
    expect(onAnswer.mock.calls[0][0]).toHaveLength(2);
  });

  it("labels the skip action 'Connect later'", () => {
    renderConnect();
    expect(screen.getByRole("button", { name: "agentBuilder.ui.connectLater" })).toBeInTheDocument();
  });

  it("awaits any pending autosave before starting a link (item 5)", async () => {
    let resolveSave: () => void = () => {};
    waitForPendingSave.mockReturnValue(new Promise<void>((r) => { resolveSave = r; }));
    unlinkAccountsMock.mockReturnValue({ accounts: [{ id: "acc-9", name: "Lotus Zalo", type: "ZALO_ACCOUNT" }] });

    const user = userEvent.setup();
    renderConnect();
    await user.click(screen.getByRole("button", { name: "agentBuilder.ui.useChannel" }));

    // The mutation must not have started yet: waitForPendingSave hasn't resolved.
    expect(linkChatbotAccount).not.toHaveBeenCalled();

    resolveSave();
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-9"] }));
  });
});
