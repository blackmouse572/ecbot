import { useAccounts } from "@/hooks/api/accounts";
import { useChatbots } from "@/hooks/api/chatbot";
import { useConversations } from "@/hooks/api/conversations";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { isConnectableAccountType } from "@/routes/chatbot/chatbot-create/agent-builder/channel-accounts";
import {
  ACTIVE_CHATBOT_COUNT_QUERY,
  STATS_COUNT_QUERY,
  GETTING_STARTED_STEPS,
  LINKED_ACCOUNT_QUERY,
} from "../constants";
import type { GettingStartedStep, GettingStartedStepKey } from "../types";

/**
 * The getting-started checklist with each step's done state, read from what
 * actually answers customers: a channel counts once it is connected, linking
 * an agent to it is its own step, and an agent counts once it is active, not
 * merely once a draft exists. Empty while
 * any query is loading or failed, so a step is never shown undone by mistake.
 */
export function useGettingStartedSteps(): GettingStartedStep[] {
  const { workspaceSlug } = useWorkspaceParams();
  const chatbots = useChatbots(STATS_COUNT_QUERY);
  const active = useChatbots(ACTIVE_CHATBOT_COUNT_QUERY);
  const accounts = useAccounts(LINKED_ACCOUNT_QUERY);
  const conversations = useConversations(STATS_COUNT_QUERY);

  if (
    [chatbots, active, accounts, conversations].some(
      (q) => q.isLoading || q.isError,
    )
  ) {
    return [];
  }

  // Only types an agent can be linked to are channels; a user-level Facebook
  // account with no pages has nothing to link.
  const channels =
    accounts.accounts?.filter((account) =>
      isConnectableAccountType(account.type),
    ) ?? [];

  const done: Record<GettingStartedStepKey, boolean> = {
    chatbot: chatbots.count > 0,
    account: channels.length > 0,
    link: channels.some((account) => account.chatbot),
    activate: active.count > 0,
    conversation: conversations.count > 0,
  };

  return GETTING_STARTED_STEPS.map(({ key, path, icon }) => ({
    key,
    icon,
    to: `/${workspaceSlug}/${path}`,
    done: done[key],
  }));
}
