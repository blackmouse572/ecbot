import type { ChannelId, Question } from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { IconPencil } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { LinkedAccountRef } from "../builder-state";
import { channelOfAccountType } from "../channel-accounts";

/**
 * The channels question's answered summary bubble: "{lead} {list}", where
 * the list names the connected accounts ("Lotus Spa (Messenger)") followed
 * by any coming-soon picks. Reads `linkedAccounts` from the builder's local
 * state (not a query) so it is correct the instant an account is linked or
 * unlinked, with no async gap. A channel id in the profile answer that has
 * no matching linked account (a legacy profile from before this feature, or
 * a coming-soon pick) still shows as a plain label.
 */
export function ChannelsAnswer({
  question,
  linkedAccounts,
  channels,
  onEdit,
}: {
  question: Question;
  linkedAccounts: LinkedAccountRef[];
  channels: string[];
  onEdit: () => void;
}) {
  const { t } = useTranslation();

  const accountChannels = new Set(
    linkedAccounts.map((a) => channelOfAccountType(a.type)).filter((c): c is ChannelId => !!c),
  );
  const accountParts = linkedAccounts.map((account) => {
    const channel = channelOfAccountType(account.type);
    const label = channel ? t(`agentBuilder.channels.${channel}`) : account.type;
    return `${account.name} (${label})`;
  });
  // Channel ids the profile answer carries but no linked account matches:
  // either a coming-soon pick, or a legacy profile answered before channels
  // connected to real accounts.
  const unmatched = channels.filter((c): c is ChannelId => !accountChannels.has(c as ChannelId));
  const unmatchedParts = unmatched.map((c) => t(`agentBuilder.channels.${c}`));

  const summary = [...accountParts, ...unmatchedParts].join(", ") || t("agentBuilder.ui.skipped");
  const lead = t(question.leadKey);

  return (
    <Message from="user">
      <MessageContent
        render={<button type="button" onClick={onEdit} title={t("actions.edit")} className="group text-left" />}
      >
        <span className="flex items-center gap-2">
          {lead} {summary}
          <IconPencil size={14} className="shrink-0 opacity-50 group-hover:opacity-100" />
        </span>
      </MessageContent>
    </Message>
  );
}
