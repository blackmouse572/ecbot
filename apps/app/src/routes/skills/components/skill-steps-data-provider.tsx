import { useCustomerTagList } from "@/hooks/api/customer-tags";
import {
  toolDetailQueryOptions,
  useGetTool,
  useInfiniteToolList,
} from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import {
  SkillStepsDataProvider as SharedProvider,
  type SkillStepsData,
} from "@repo/ui/skill-steps";
import { useQueryClient } from "@tanstack/react-query";
import type { FC, ReactNode } from "react";
import { toolNameOf } from "../utils";

// The steps editor's tools and tags come from the current workspace.
export const SkillStepsDataProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { workspaceSlug } = useWorkspaceParams();
  const queryClient = useQueryClient();
  const data: SkillStepsData = {
    useToolList: (search) => useInfiniteToolList(workspaceSlug, search),
    useTool: (toolId) =>
      useGetTool(workspaceSlug, toolId, { enabled: !!toolId }).tool,
    useTagNames: () => useCustomerTagList().tags.map((tag) => tag.name),
    toolNamer: async (ids) => {
      const tools = await Promise.all(
        ids.map((id) =>
          queryClient
            .fetchQuery(toolDetailQueryOptions(workspaceSlug, id))
            .then((res) => res.data)
            .catch(() => undefined),
        ),
      );
      return toolNameOf(tools.filter((x) => !!x));
    },
  };
  return <SharedProvider value={data}>{children}</SharedProvider>;
};
