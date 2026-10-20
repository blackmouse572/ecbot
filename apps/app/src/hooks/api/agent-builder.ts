import type { AgentSuggestion } from "@repo/agent-blueprint";
import { agentBuilderWorkspaceControllerSuggestV1, agentBuilderWorkspaceControllerWarmV1 } from "@repo/client";
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

/** Wakes the AI service, which scales to zero, before a description is sent (#256). */
export const useAgentBuilderWarm = () => {
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: () => agentBuilderWorkspaceControllerWarmV1({ path: { workspace: workspace!.slug } }),
  });
};
