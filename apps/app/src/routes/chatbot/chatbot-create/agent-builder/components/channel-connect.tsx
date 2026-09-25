import {
  TELEGRAM_TOKEN_PATTERN,
  TelegramTokenField,
} from "@/components/channel-connect/telegram-token-field";
import { isHttpUrl, splitOrigins } from "@/components/channel-connect/website-origins";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import {
  useFetchUnlinkedAccounts,
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
import { Button, IconButton, Input, Label, Text, Textarea, clx } from "@medusajs/ui";
import type { ChannelId } from "@repo/agent-blueprint";
import type { AccountGetDetailResponseDto, AccountListResponseDto } from "@repo/client";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LinkedAccountRef } from "../builder-state";
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
  linkedAccounts: LinkedAccountRef[];
  onAccountsLinked: (accounts: LinkedAccountRef[]) => void;
  onAccountsUnlinked: (ids: string[]) => void;
  onAnswer: (channels: string[]) => void;
  /** Serializes account changes against autosave (fix round 1, item 5):
   * `accounts` is replace-all server side, so a link/unlink and a debounced
   * autosave racing each other can drop whichever one loses. */
  beginAccountsChange: () => void;
  endAccountsChange: () => void;
  waitForPendingSave: () => Promise<void>;
};

export function ChannelConnect({
  chatbotId, agentName, channels, linkedAccounts, onAccountsLinked, onAccountsUnlinked, onAnswer,
  beginAccountsChange, endAccountsChange, waitForPendingSave,
}: Props) {
  const { t } = useTranslation();
  const { accounts: unlinkedAccounts } = useUnlinkAccounts();
  const fetchUnlinkedAccounts = useFetchUnlinkedAccounts();

  const linkAccount = useLinkAccount();
  const linkChatbotAccount = useLinkChatbotAccount(chatbotId);
  const unlinkChatbotAccount = useUnlinkChatbotAccount(chatbotId);
  const provisionWidget = useProvisionWebsiteWidget();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Accounts an OAuth/Telegram response returned that turned out to belong
  // to another chatbot already (fix round 1, item 1: "no stealing").
  const [inUseAccounts, setInUseAccounts] = useState<LinkedAccountRef[]>([]);
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
  const widgetNameId = useId();
  const widgetOriginsId = useId();

  // Which oauth popup is currently in flight; both oauth hooks below stay
  // mounted at once (messenger and zalo cards are both always visible), so
  // this stops the other platform's listener from also reacting to a single
  // postMessage.
  const pendingOAuth = useRef<ChannelId | null>(null);
  const oauthPending = busy === "messenger" || busy === "zalo" ? (busy as ChannelId) : null;

  /**
   * Runs one account mutation with the round-1 fixes applied uniformly:
   * awaits any autosave already in flight first (item 5), marks this change
   * "in flight" so autosave waits for it in turn, and manages the busy/error
   * UI state around it.
   */
  const runAccountChange = async (busyKey: string, fn: () => Promise<void>) => {
    await waitForPendingSave();
    beginAccountsChange();
    setBusy(busyKey);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
      endAccountsChange();
    }
  };

  /**
   * The no-stealing check (fix round 1, item 1): `syncAccount` upserts by
   * externalId, so a link response can return an id already owned by
   * another chatbot. Only candidates that are either already on this bot or
   * currently unlinked (checked fresh, not from cache) are linked; the rest
   * surface an inline notice instead of silently moving someone else's
   * channel.
   */
  const linkAllowed = async (candidates: LinkedAccountRef[]) => {
    if (!candidates.length) return;
    const alreadyOnThisBot = new Set(linkedAccounts.map((a) => a.id));
    const toCheck = candidates.filter((c) => !alreadyOnThisBot.has(c.id));
    let freshUnlinkedIds = new Set<string>();
    if (toCheck.length) {
      const fresh = await fetchUnlinkedAccounts();
      freshUnlinkedIds = new Set((fresh?.data ?? []).map((a) => a.id));
    }
    const linkable = candidates.filter((c) => alreadyOnThisBot.has(c.id) || freshUnlinkedIds.has(c.id));
    const blocked = candidates.filter((c) => !alreadyOnThisBot.has(c.id) && !freshUnlinkedIds.has(c.id));
    if (blocked.length) {
      setInUseAccounts((prev) => {
        const existing = new Set(prev.map((a) => a.id));
        return [...prev, ...blocked.filter((b) => !existing.has(b.id))];
      });
    }
    if (linkable.length) {
      await linkChatbotAccount.mutateAsync({ accounts: linkable.map((a) => a.id) });
      onAccountsLinked(linkable);
    }
  };

  const linkOAuthAccount = (channel: ChannelId, platform: string, code: string) =>
    runAccountChange(channel, async () => {
      const res = await linkAccount.mutateAsync({ code, platform: platform as A });
      const linked = (res.data as A)?.data as LinkedAccount | null | undefined;
      if (!linked) return;
      // Facebook: link the pages only, never the user-level account row.
      const candidates: LinkedAccountRef[] = linked.pages?.length
        ? linked.pages.map((p) => ({ id: p.id, type: p.type, name: p.name }))
        : [{ id: linked.id, type: linked.type, name: linked.name }];
      await linkAllowed(candidates);
    });

  const { handleLinkClick: openMessenger } = useOAuthLogin("FACEBOOK_ACCOUNT", {
    onSuccess: ({ code }) => {
      if (pendingOAuth.current !== "messenger") return;
      pendingOAuth.current = null;
      void linkOAuthAccount("messenger", "FACEBOOK_ACCOUNT", code);
    },
    onError: () => {
      if (pendingOAuth.current !== "messenger") return;
      pendingOAuth.current = null;
      setBusy(null);
      setError(true);
    },
    onClosed: () => {
      if (pendingOAuth.current !== "messenger") return;
      pendingOAuth.current = null;
      setBusy(null);
    },
  });
  const { handleLinkClick: openZalo } = useOAuthLogin("ZALO_ACCOUNT", {
    onSuccess: ({ code }) => {
      if (pendingOAuth.current !== "zalo") return;
      pendingOAuth.current = null;
      void linkOAuthAccount("zalo", "ZALO_ACCOUNT", code);
    },
    onError: () => {
      if (pendingOAuth.current !== "zalo") return;
      pendingOAuth.current = null;
      setBusy(null);
      setError(true);
    },
    onClosed: () => {
      if (pendingOAuth.current !== "zalo") return;
      pendingOAuth.current = null;
      setBusy(null);
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

  const handleTelegramConnect = () => {
    const token = telegramToken.trim();
    if (!TELEGRAM_TOKEN_PATTERN.test(token)) {
      setTelegramError(t("accounts.create.connect.telegram.tokenInvalid"));
      return;
    }
    setTelegramError(undefined);
    return runAccountChange("telegram", async () => {
      const res = await linkAccount.mutateAsync({ code: token, platform: "TELEGRAM_BOT" });
      const linked = (res.data as A)?.data as LinkedAccount | null | undefined;
      if (!linked) return;
      await linkAllowed([{ id: linked.id, type: linked.type, name: linked.name }]);
      setTelegramToken("");
      setExpanded(null);
    });
  };

  const handleWidgetProvision = () => {
    const origins = splitOrigins(widgetOrigins);
    if (!widgetName.trim() || !origins.length || !origins.every(isHttpUrl)) {
      setWidgetError(t("accounts.create.provision.websiteWidget.originsInvalid"));
      return;
    }
    setWidgetError(undefined);
    return runAccountChange("website", async () => {
      const res = await provisionWidget.mutateAsync({ name: widgetName.trim(), allowedOrigins: origins });
      await linkChatbotAccount.mutateAsync({ accounts: [res.id] });
      onAccountsLinked([{ id: res.id, type: "WEBSITE_WIDGET", name: widgetName.trim() }]);
      setIssued({ kind: "WEBSITE_WIDGET", widgetKey: res.widgetKey });
    });
  };

  const handleUseExisting = (account: AccountListResponseDto) =>
    runAccountChange(account.id, async () => {
      await linkChatbotAccount.mutateAsync({ accounts: [account.id] });
      onAccountsLinked([{ id: account.id, type: account.type, name: account.name }]);
    });

  const handleUnlink = (accountId: string) =>
    runAccountChange(accountId, async () => {
      await unlinkChatbotAccount.mutateAsync({ accounts: [accountId] });
      onAccountsUnlinked([accountId]);
    });

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
          // Only one OAuth flow at a time: while messenger or zalo is
          // mid-popup, disable the other OAuth card so its click can't be
          // misread as belonging to the flow already in progress.
          const disabledByOtherOAuth = connect.kind === "oauth" && oauthPending !== null && oauthPending !== channel;
          return (
            <button
              key={channel}
              type="button"
              aria-pressed={connect.kind === "comingSoon" ? selected : undefined}
              onClick={() => handleCardClick(channel)}
              disabled={busy === channel || disabledByOtherOAuth}
              className={clx(
                "flex items-center gap-2 rounded-md border p-3 text-left transition-colors duration-150 ease-out",
                "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive",
                "disabled:cursor-not-allowed disabled:opacity-60",
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
            <Label htmlFor={widgetNameId} size="xsmall" weight="plus">
              {t("accounts.create.provision.nameLabel")}
            </Label>
            <Input
              id={widgetNameId}
              placeholder={t("accounts.create.provision.namePlaceholder")}
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              disabled={busy === "website"}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor={widgetOriginsId} size="xsmall" weight="plus">
              {t("agentBuilder.ui.widgetOriginsLabel")}
            </Label>
            <Textarea
              id={widgetOriginsId}
              value={widgetOrigins}
              onChange={(e) => setWidgetOrigins(e.target.value)}
              disabled={busy === "website"}
              placeholder="https://shop.example.com"
              rows={3}
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
        <IssuedPanel
          issued={issued}
          onDone={() => {
            setExpanded(null);
            // Clears the issued key so reopening the website card shows a
            // fresh provision form instead of the last widget's panel
            // again (fix round 1, item 4).
            setIssued(null);
          }}
        />
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
                aria-label={t("agentBuilder.ui.unlinkChannel", { name: account.name })}
              >
                <XMarkMini />
              </IconButton>
            </div>
          ))}
          {Array.from(comingSoon).map((channel) => {
            const label = t(`agentBuilder.channels.${channel}`);
            return (
              <div key={channel} className="flex items-center gap-1.5 rounded-full border border-ui-border-base bg-ui-bg-base py-1 pl-2 pr-1">
                <Text size="xsmall">{label}</Text>
                <IconButton
                  type="button"
                  variant="transparent"
                  size="small"
                  onClick={() => handleCardClick(channel)}
                  aria-label={t("agentBuilder.ui.unlinkChannel", { name: label })}
                >
                  <XMarkMini />
                </IconButton>
              </div>
            );
          })}
        </div>
      )}

      {inUseAccounts.map((account) => (
        <Text key={account.id} size="small" className="text-ui-fg-error">
          {t("agentBuilder.ui.channelInUse", { name: account.name })}
        </Text>
      ))}

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
