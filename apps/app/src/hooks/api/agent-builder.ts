import type { AgentSuggestion } from "@repo/agent-blueprint";
import { agentBuilderWorkspaceControllerSuggestV1 } from "@repo/client";
import { useMutation } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const useAgentBuilderSuggest = () => {
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: (description: string) =>
      agentBuilderWorkspaceControllerSuggestV1({
        path: { workspace: workspace!.slug },
        body: { description },
      }).then(
        (res) =>
          ((res as { data?: { data?: AgentSuggestion } }).data?.data ?? null) as AgentSuggestion | null,
      ),
  });
};
