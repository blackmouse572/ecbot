import { useAccounts } from "@/hooks/api/accounts";
import { useChatbots } from "@/hooks/api/chatbot";
import { useConversations } from "@/hooks/api/conversations";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { GETTING_STARTED_STEPS, STATS_COUNT_QUERY } from "../constants";
import type { GettingStartedStep } from "../types";

/**
 * The getting-started checklist with each step's done state, read from the
 * same list totals as the dashboard stats (same query keys, no extra
 * requests). Empty while any count is still loading or failed, so a step is
 * never shown as undone by mistake.
 */
export function useGettingStartedSteps(): GettingStartedStep[] {
  const { workspaceSlug } = useWorkspaceParams();
  const chatbots = useChatbots(STATS_COUNT_QUERY);
  const accounts = useAccounts(STATS_COUNT_QUERY);
  const conversations = useConversations(STATS_COUNT_QUERY);

  const queries = {
    chatbot: chatbots,
    account: accounts,
    conversation: conversations,
  };
  if (Object.values(queries).some((q) => q.isLoading || q.isError)) {
    return [];
  }

  return GETTING_STARTED_STEPS.map(({ key, path }) => ({
    key,
    to: `/${workspaceSlug}/${path}`,
    done: queries[key].count > 0,
  }));
}
