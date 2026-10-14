import { useAccounts } from "@/hooks/api/accounts";
import { useChatbots } from "@/hooks/api/chatbot";
import { useConversations } from "@/hooks/api/conversations";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import {
  ACTIVE_CHATBOT_COUNT_QUERY,
  STATS_COUNT_QUERY,
  GETTING_STARTED_STEPS,
  LINKED_ACCOUNT_QUERY,
} from "../constants";
import type { GettingStartedStep, GettingStartedStepKey } from "../types";

/**
 * The getting-started checklist with each step's done state, read from what
 * actually answers customers: a channel counts once an agent is linked to it,
 * and an agent once it is active, not merely once a draft exists. Empty while
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

  const done: Record<GettingStartedStepKey, boolean> = {
    chatbot: chatbots.count > 0,
    account: !!accounts.accounts?.some((account) => account.chatbot),
    activate: active.count > 0,
    conversation: conversations.count > 0,
  };
  // A channel connected without an agent is linked from the channel list,
  // not by connecting another one.
  const path = (key: GettingStartedStepKey, fallback: string) =>
    key === "account" && accounts.count > 0 ? ROUTES.Accounts : fallback;

  return GETTING_STARTED_STEPS.map(({ key, path: stepPath, icon }) => ({
    key,
    icon,
    to: `/${workspaceSlug}/${path(key, stepPath)}`,
    done: done[key],
  }));
}
