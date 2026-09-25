import {
  TELEGRAM_TOKEN_PATTERN,
  TelegramTokenField,
} from "@/components/channel-connect/telegram-token-field";
import { isHttpUrl, splitOrigins } from "@/components/channel-connect/website-origins";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import {
  useChatbot,
  useLinkAccount,
  useLinkChatbotAccount,
  useProvisionWebsiteWidget,
  useUnlinkAccounts,
  useUnlinkChatbotAccount,
} from "@/hooks/api";
import { useOAuthLogin } from "@/hooks/use-oauth-login";
import { IssuedPanel } from "@/routes/accounts/account-create/components/account-create-form/provision-step";
import type { Issued } from "@/routes/accounts/account-create/components/account-create-form/provisioned-platforms";
import { XMarkMini } from "@medusajs/icons";
import { Button, IconButton, Input, Text, clx } from "@medusajs/ui";
import type { ChannelId } from "@repo/agent-blueprint";
import type { AccountGetDetailResponseDto, AccountListResponseDto } from "@repo/client";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CHANNEL_CONNECT, channelOfAccountType } from "../channel-accounts";
import { channelIcon } from "./channel-icon";

const GRID_CHANNELS: ChannelId[] = ["messenger", "zalo", "telegram", "website", "instagram", "tiktok", "shopee"];
const COMING_SOON_CHANNELS: ChannelId[] = ["instagram", "tiktok", "shopee"];

// A linked account's platform-typed response, as `useLinkAccount` actually
// resolves it (see hooks/api/accounts.ts: `res.data.data`). Facebook returns
// the primary account plus any pages under `pages`; the generated response
// type only carries `message`/`statusCode`, so this mirrors the accounts
// create form's own cast rather than inventing a stricter type the client
// doesn't generate.
type LinkedAccount = AccountGetDetailResponseDto & { pages?: AccountGetDetailResponseDto[] };

type Props = {
  chatbotId: string;
  agentName: string;
  channels: string[];
  onAccountsLinked: (ids: string[]) => void;
  onAccountsUnlinked: (ids: string[]) => void;
  onAnswer: (channels: string[]) => void;
};

export function ChannelConnect({ chatbotId, agentName, channels, onAccountsLinked, onAccountsUnlinked, onAnswer }: Props) {
  const { t } = useTranslation();
  const { accounts: unlinkedAccounts } = useUnlinkAccounts();
  const { chatbot } = useChatbot(chatbotId);
  const linkedAccounts = chatbot?.accounts ?? [];

  const linkAccount = useLinkAccount();
  const linkChatbotAccount = useLinkChatbotAccount(chatbotId);
  const unlinkChatbotAccount = useUnlinkChatbotAccount(chatbotId);
  const provisionWidget = useProvisionWebsiteWidget();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<ChannelId | null>(null);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramError, setTelegramError] = useState<string | undefined>();
  const [widgetName, setWidgetName] = useState(agentName);
  const [widgetOrigins, setWidgetOrigins] = useState("");
  const [widgetError, setWidgetError] = useState<string | undefined>();
  const [issued, setIssued] = useState<Issued | null>(null);
  const [comingSoon, setComingSoon] = useState<Set<ChannelId>>(
    () => new Set(channels.filter((c) => COMING_SOON_CHANNELS.includes(c as ChannelId)) as ChannelId[]),
  );
  // Which oauth popup is currently in flight — both oauth hooks below stay
  // mounted at once (messenger and zalo cards are both always visible), so
  // this stops the other platform's listener from also reacting to a single
  // postMessage.
  const pendingOAuth = useRef<ChannelId | null>(null);

  const linkOAuthAccount = async (channel: ChannelId, platform: string, code: string) => {
    setBusy(channel);
    setError(false);
    try {
      const res = await linkAccount.mutateAsync({ code, platform: platform as A });
      const linked = (res.data as A)?.data as LinkedAccount | null | undefined;
      const ids = linked ? [linked.id, ...(linked.pages ?? []).map((p) => p.id)] : [];
      if (ids.length) {
        await linkChatbotAccount.mutateAsync({ accounts: ids });
        onAccountsLinked(ids);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const { handleLinkClick: openMessenger } = useOAuthLogin("FACEBOOK_ACCOUNT", {
    onSuccess: ({ code }) => {
      if (pendingOAuth.current !== "messenger") return;
      void linkOAuthAccount("messenger", "FACEBOOK_ACCOUNT", code);
    },
    onError: () => {
      if (pendingOAuth.current !== "messenger") return;
      setError(true);
    },
  });
  const { handleLinkClick: openZalo } = useOAuthLogin("ZALO_ACCOUNT", {
    onSuccess: ({ code }) => {
      if (pendingOAuth.current !== "zalo") return;
      void linkOAuthAccount("zalo", "ZALO_ACCOUNT", code);
    },
    onError: () => {
      if (pendingOAuth.current !== "zalo") return;
      setError(true);
    },
  });

  const handleCardClick = (channel: ChannelId) => {
    const connect = CHANNEL_CONNECT[channel];
    setError(false);
    if (connect.kind === "comingSoon") {
      setComingSoon((prev) => {
        const next = new Set(prev);
        if (next.has(channel)) next.delete(channel);
        else next.add(channel);
        return next;
      });
      return;
    }
    if (connect.kind === "oauth") {
      pendingOAuth.current = channel;
      setBusy(channel);
      if (channel === "messenger") openMessenger();
      else openZalo();
      return;
    }
    // token (telegram) / widget (website): expand the inline form.
    setExpanded((prev) => (prev === channel ? null : channel));
  };

  const handleTelegramConnect = async () => {
    const token = telegramToken.trim();
    if (!TELEGRAM_TOKEN_PATTERN.test(token)) {
      setTelegramError(t("accounts.create.connect.telegram.tokenInvalid"));
      return;
    }
    setTelegramError(undefined);
    setBusy("telegram");
    setError(false);
    try {
      const res = await linkAccount.mutateAsync({ code: token, platform: "TELEGRAM_BOT" });
      const linked = (res.data as A)?.data as LinkedAccount | null | undefined;
      if (linked) {
        await linkChatbotAccount.mutateAsync({ accounts: [linked.id] });
        onAccountsLinked([linked.id]);
        setTelegramToken("");
        setExpanded(null);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const handleWidgetProvision = async () => {
    const origins = splitOrigins(widgetOrigins);
    if (!widgetName.trim() || !origins.length || !origins.every(isHttpUrl)) {
      setWidgetError(t("accounts.create.provision.websiteWidget.originsInvalid"));
      return;
    }
    setWidgetError(undefined);
    setBusy("website");
    setError(false);
    try {
      const res = await provisionWidget.mutateAsync({ name: widgetName.trim(), allowedOrigins: origins });
      await linkChatbotAccount.mutateAsync({ accounts: [res.id] });
      onAccountsLinked([res.id]);
      setIssued({ kind: "WEBSITE_WIDGET", widgetKey: res.widgetKey });
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const handleUseExisting = async (account: AccountListResponseDto) => {
    setBusy(account.id);
    setError(false);
    try {
      await linkChatbotAccount.mutateAsync({ accounts: [account.id] });
      onAccountsLinked([account.id]);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const handleUnlink = async (accountId: string) => {
    setBusy(accountId);
    setError(false);
    try {
      await unlinkChatbotAccount.mutateAsync({ accounts: [accountId] });
      onAccountsUnlinked([accountId]);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const commit = () => {
    const fromAccounts = linkedAccounts
      .map((a) => channelOfAccountType(a.type))
      .filter((c): c is ChannelId => !!c);
    onAnswer(Array.from(new Set([...fromAccounts, ...comingSoon])));
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {unlinkedAccounts && unlinkedAccounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text size="small" weight="plus">
            {t("agentBuilder.ui.existingChannels")}
          </Text>
          <div className="flex flex-col gap-1">
            {unlinkedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2"
              >
                <PlatformIcon type={account.type} size={18} />
                <Text size="small" className="flex-1 truncate">
                  {account.name}
                </Text>
                <Button
                  size="small"
                  variant="secondary"
                  isLoading={busy === account.id}
                  onClick={() => handleUseExisting(account)}
                >
                  {t("agentBuilder.ui.useChannel")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {GRID_CHANNELS.map((channel) => {
          const connect = CHANNEL_CONNECT[channel];
          const selected = connect.kind === "comingSoon" && comingSoon.has(channel);
          const connected = linkedAccounts.some((a) => channelOfAccountType(a.type) === channel);
          return (
            <button
              key={channel}
              type="button"
              aria-pressed={connect.kind === "comingSoon" ? selected : undefined}
              onClick={() => handleCardClick(channel)}
              disabled={busy === channel}
              className={clx(
                "flex items-center gap-2 rounded-md border p-3 text-left transition-colors duration-150 ease-out",
                "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive",
                selected && "border-ui-border-interactive bg-ui-bg-highlight",
              )}
            >
              {channelIcon(channel)}
              <Text size="small" weight="plus" className="flex-1">
                {t(`agentBuilder.channels.${channel}`)}
              </Text>
              {connect.kind === "comingSoon" ? (
                <Text size="xsmall" className="text-ui-fg-subtle shrink-0">
                  {t("agentBuilder.ui.comingSoon")}
                </Text>
              ) : (
                connected && (
                  <Text size="xsmall" className="text-ui-fg-interactive shrink-0">
                    {t("agentBuilder.ui.connected")}
                  </Text>
                )
              )}
            </button>
          );
        })}
      </div>

      {expanded === "telegram" && (
        <div className="flex flex-col gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
          <TelegramTokenField
            value={telegramToken}
            onChange={setTelegramToken}
            error={telegramError}
            disabled={busy === "telegram"}
            label={t("agentBuilder.ui.telegramTokenLabel")}
          />
          <Button size="small" isLoading={busy === "telegram"} onClick={handleTelegramConnect}>
            {t("accounts.create.connect.telegram.cta")}
          </Button>
        </div>
      )}

      {expanded === "website" && !issued && (
        <div className="flex flex-col gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
          <div className="flex flex-col gap-y-2">
            <Text size="xsmall" weight="plus">
              {t("accounts.create.provision.nameLabel")}
            </Text>
            <Input
              placeholder={t("accounts.create.provision.namePlaceholder")}
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              disabled={busy === "website"}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text size="xsmall" weight="plus">
              {t("agentBuilder.ui.widgetOriginsLabel")}
            </Text>
            <textarea
              className="min-h-16 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 py-1.5 text-ui-fg-base text-sm"
              value={widgetOrigins}
              onChange={(e) => setWidgetOrigins(e.target.value)}
              disabled={busy === "website"}
              placeholder="https://shop.example.com"
            />
            {widgetError && (
              <Text size="xsmall" className="text-ui-fg-error">
                {widgetError}
              </Text>
            )}
          </div>
          <Button size="small" isLoading={busy === "website"} onClick={handleWidgetProvision}>
            {t("accounts.create.provision.cta")}
          </Button>
        </div>
      )}

      {expanded === "website" && issued && (
        <IssuedPanel issued={issued} onDone={() => setExpanded(null)} />
      )}

      {(linkedAccounts.length > 0 || comingSoon.size > 0) && (
        <div className="flex flex-wrap gap-2">
          {linkedAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-1.5 rounded-full border border-ui-border-base bg-ui-bg-base py-1 pl-1.5 pr-1"
            >
              <PlatformIcon type={account.type} size={16} />
              <Text size="xsmall">{account.name}</Text>
              <IconButton
                type="button"
                variant="transparent"
                size="small"
                isLoading={busy === account.id}
                onClick={() => handleUnlink(account.id)}
                aria-label={t("actions.close")}
              >
                <XMarkMini />
              </IconButton>
            </div>
          ))}
          {Array.from(comingSoon).map((channel) => (
            <div key={channel} className="flex items-center gap-1.5 rounded-full border border-ui-border-base bg-ui-bg-base py-1 pl-2 pr-1">
              <Text size="xsmall">{t(`agentBuilder.channels.${channel}`)}</Text>
              <IconButton
                type="button"
                variant="transparent"
                size="small"
                onClick={() => handleCardClick(channel)}
                aria-label={t("actions.close")}
              >
                <XMarkMini />
              </IconButton>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Text size="small" className="text-ui-fg-error">
          {t("agentBuilder.ui.connectFailed")}
        </Text>
      )}

      <div className="flex gap-2">
        <Button size="small" variant="secondary" onClick={commit}>
          {t("agentBuilder.ui.connectLater")}
        </Button>
        <Button size="small" onClick={commit}>
          {t("actions.next")}
        </Button>
      </div>
    </div>
  );
}
