import {
  ArrowPath,
  BellAlert,
  ExclamationCircle,
  FaceSmile,
  Sparkle2Solid,
} from "@medusajs/icons";
import { IconButton, Text, Tooltip, clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
  Message,
  MessageContent,
  ReactionPicker,
} from "@repo/ui/common-components";
import { ToolCallList } from "@/components/ai-chat/tool-call-list";
import type {
  MessageAuthorType,
  MessageGetResponseDto,
  ReactToMessageAction,
} from "@/hooks/api/conversations";
import type { ChatToolCall, MessageAttachment } from "@/types/chat-message";
import { MessageImages } from "./message-images";
import { POLICY_URL } from "./reaction-window";

// Telegram's allowed-reaction set is a superset supported across the
// Messenger/Telegram/Zalo adapters we outbound-react through today.
const QUICK_REACTIONS = ["👍", "❤️", "🔥", "🎉", "😁", "😢"] as const;

// TODO: remove this once `pnpm generate:client` regenerates @repo/client
// to include the new `toolCalls` / `attachments` fields on
// MessageGetResponseDto. Until then, we cast at the read site to surface the
// fields added on the api side.
type MessageWithToolCalls = MessageGetResponseDto & {
  toolCalls?: ChatToolCall[];
  attachments?: MessageAttachment[];
};

interface Props {
  id?: string;
  message: MessageGetResponseDto;
  currentOperatorId?: string;
  onRetry?: (text: string, clientNonce: string) => void;
  hasFollowup?: boolean;
  canReact?: boolean;
  /**
   * Platform supports reactions (`canReact`) but Meta's 24h messaging window has
   * closed, so reacting would be rejected by policy — show a disabled affordance
   * with an explanatory tooltip instead of the picker (#248).
   */
  reactionWindowClosed?: boolean;
  onReact?: (
    messageId: string,
    emoji: string,
    action: ReactToMessageAction,
  ) => void;
}

const authorKey = (type: MessageAuthorType) => {
  switch (type) {
    case "USER":
      return "conversations.author.user" as const;
    case "BOT":
      return "conversations.author.bot" as const;
    case "OPERATOR":
      return "conversations.author.operator" as const;
  }
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const MessageBubble = ({
  id,
  message,
  currentOperatorId,
  onRetry,
  hasFollowup,
  canReact,
  reactionWindowClosed,
  onReact,
}: Props) => {
  const { t } = useTranslation();
  const isInbound = message.direction === "INBOUND";
  const isFailed = message.status === "FAILED";
  const isPending = message.status === "PENDING";
  const clientNonce = (message as A)._clientNonce as string | undefined;
  const author = (message as A).author as
    | { id: string; name: string }
    | undefined;
  const { toolCalls, attachments } = message as MessageWithToolCalls;

  // Group reactions by emoji for the chip row; track whether the current
  // operator is one of the reactors so their chip can be highlighted.
  const reactionGroups = Object.values(
    (message.reactions ?? []).reduce<
      Record<string, { emoji: string; count: number; mine: boolean }>
    >((acc, r) => {
      const entry = acc[r.emoji] ?? { emoji: r.emoji, count: 0, mine: false };
      entry.count += 1;
      if (r.actorType === "operator" && r.actorId === currentOperatorId) {
        entry.mine = true;
      }
      acc[r.emoji] = entry;
      return acc;
    }, {}),
  );

  const handleReact = (emoji: string) => {
    if (!onReact) return;
    const mine = reactionGroups.find((g) => g.emoji === emoji)?.mine;
    onReact(message.id, emoji, mine ? "unreact" : "react");
  };

  const displayName =
    author?.id && currentOperatorId && author.id === currentOperatorId
      ? t("conversations.author.you")
      : (author?.name ?? t(authorKey(message.authorType)));

  // INBOUND (end user) → left side uses "assistant" role in the shared component
  // OUTBOUND (operator/bot) → right side uses "user" role
  const role = isInbound ? "assistant" : "user";

  const reactTrigger = !canReact ? null : reactionWindowClosed ? (
    <Tooltip
      content={
        <span>
          {t("conversations.reactions.windowClosedTooltip")}{" "}
          <a
            href={POLICY_URL}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {t("conversations.reactions.policyLink")}
          </a>
        </span>
      }
    >
      <IconButton
        size="2xsmall"
        variant="transparent"
        aria-disabled
        onClick={(e) => e.preventDefault()}
        aria-label={t("conversations.reactions.windowClosed")}
        className="cursor-not-allowed opacity-0 transition-opacity group-focus-within/message:opacity-40 group-hover/message:opacity-40"
      >
        <FaceSmile />
      </IconButton>
    </Tooltip>
  ) : (
    <ReactionPicker
      quickReactions={QUICK_REACTIONS}
      onSelect={handleReact}
      align={isInbound ? "start" : "end"}
      className="opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 data-[popup-open]:opacity-100"
      triggerLabel={t("conversations.reactions.addReaction")}
      quickReactLabel={(emoji) =>
        t("conversations.reactions.quickReact", { emoji })
      }
      moreLabel={t("conversations.reactions.more")}
      searchPlaceholder={t("general.emojiSearch")}
      noResultsLabel={t("general.emojiNoResults")}
      loadingLabel={t("general.emojiLoading")}
    />
  );

  return (
    <Message from={role} id={id}>
      <div
        className={clx(
          "text-ui-fg-muted flex items-center gap-x-1.5",
          !isInbound && "justify-end",
        )}
      >
        {message.authorType === "BOT" && <Sparkle2Solid />}
        <Text size="xsmall" weight="plus">
          {displayName}
        </Text>
        <Text size="xsmall">{formatTime(message.dateSent)}</Text>
        {hasFollowup && (
          <Tooltip content={t("conversations.customer.panel.followups.badge")}>
            <BellAlert className="text-ui-fg-interactive" />
          </Tooltip>
        )}
      </div>
      {message.authorType === "BOT" && toolCalls && toolCalls.length > 0 && (
        <ToolCallList toolCalls={toolCalls} />
      )}
      {/* The picker sits on the bubble's inner side so it never gets pushed
          against the viewport edge. */}
      <div
        className={clx(
          "flex w-full items-center gap-1",
          isInbound ? "justify-start" : "justify-end",
        )}
      >
        {!isInbound && reactTrigger}
        {message.text ? (
          <MessageContent
            className={clx(
              "whitespace-pre-wrap",
              isPending && "opacity-70",
              isFailed && "border-ui-border-error opacity-80",
            )}
          >
            {message.text}
          </MessageContent>
        ) : (
          <MessageImages
            attachments={attachments}
            align={isInbound ? "start" : "end"}
          />
        )}
        {isInbound && reactTrigger}
      </div>
      {message.text && (
        <MessageImages
          attachments={attachments}
          align={isInbound ? "start" : "end"}
        />
      )}
      {reactionGroups.length > 0 && (
        <div
          className={clx(
            "flex flex-wrap items-center gap-1",
            !isInbound && "flex-row-reverse",
          )}
        >
          {reactionGroups.map((g) => (
            <button
              key={g.emoji}
              type="button"
              onClick={() => handleReact(g.emoji)}
              aria-label={t("conversations.reactions.toggle", {
                emoji: g.emoji,
              })}
              className={clx(
                "txt-compact-xsmall transition-fg flex items-center gap-1 rounded-full border px-2 py-0.5",
                g.mine
                  ? "bg-ui-bg-interactive border-ui-border-interactive text-ui-fg-on-color"
                  : "bg-ui-bg-base border-ui-border-base text-ui-fg-subtle hover:bg-ui-bg-base-hover",
              )}
            >
              <span>{g.emoji}</span>
              <span>{g.count}</span>
            </button>
          ))}
        </div>
      )}
      {isFailed && (
        <Marker className="text-ui-fg-error">
          <MarkerIcon className="text-ui-fg-error">
            <ExclamationCircle />
          </MarkerIcon>
          <MarkerContent>{t("conversations.composer.failed")}</MarkerContent>
          {onRetry && clientNonce && message.text && (
            <IconButton
              size="2xsmall"
              variant="transparent"
              onClick={() => onRetry(message.text ?? "", clientNonce)}
              aria-label={t("conversations.composer.retry")}
            >
              <ArrowPath />
            </IconButton>
          )}
        </Marker>
      )}
    </Message>
  );
};
