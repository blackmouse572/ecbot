import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ORIGIN_AGENT_PARAM } from "@/utils/origin-agent";
import { useSearchParams } from "react-router-dom";

/**
 * The agent a create page was opened from (see `withOriginAgent`), and the
 * path back to its detail page. Both are undefined for a normal create.
 */
export function useOriginAgent() {
  const [searchParams] = useSearchParams();
  const { workspaceSlug } = useWorkspaceParams();
  const agentId = searchParams.get(ORIGIN_AGENT_PARAM) || undefined;

  return {
    agentId,
    agentPath: agentId
      ? `/${workspaceSlug}/${ROUTES.Chatbot}/${agentId}`
      : undefined,
  };
}
