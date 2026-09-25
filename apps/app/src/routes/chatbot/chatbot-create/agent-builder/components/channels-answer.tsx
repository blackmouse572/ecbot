import { useChatbot } from "@/hooks/api";
import type { ChannelId, Question } from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { IconPencil } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { channelOfAccountType } from "../channel-accounts";

const COMING_SOON_CHANNELS: ChannelId[] = ["instagram", "tiktok", "shopee"];

/**
 * The channels question's answered summary bubble: "{lead} {list}", where
 * the list names the connected accounts ("Lotus Spa (Messenger)") followed
 * by any coming-soon picks. Unlike the generic AnswerMessage, this reads the
 * account names from the linked-accounts query rather than the profile
 * answer alone, since the profile only stores channel ids.
 */
export function ChannelsAnswer({
  question,
  chatbotId,
  channels,
  onEdit,
}: {
  question: Question;
  chatbotId: string;
  channels: string[];
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { chatbot } = useChatbot(chatbotId);
  const linkedAccounts = chatbot?.accounts ?? [];

  const accountParts = linkedAccounts.map((account) => {
    const channel = channelOfAccountType(account.type);
    const label = channel ? t(`agentBuilder.channels.${channel}`) : account.type;
    return `${account.name} (${label})`;
  });
  const comingSoonParts = channels
    .filter((c): c is ChannelId => COMING_SOON_CHANNELS.includes(c as ChannelId))
    .map((c) => t(`agentBuilder.channels.${c}`));

  const summary = [...accountParts, ...comingSoonParts].join(", ") || t("agentBuilder.ui.skipped");
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
