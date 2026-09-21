import { useGetTool } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";
import { useParams } from "react-router-dom";

type ToolDetailBreadcrumbProps = UIMatch;

export function ToolDetailBreadcrumb(_props: ToolDetailBreadcrumbProps) {
  const { toolId } = useParams<{ toolId: string }>();
  const { workspaceSlug } = useWorkspaceParams();

  const { tool } = useGetTool(workspaceSlug, toolId ?? "", {
    enabled: !!toolId,
  });

  return (
    <span>
      {tool?.name ?? toolId}
      {tool?.name && (
        <Helmet>
          <title>{tool.name} - Ecbot</title>
        </Helmet>
      )}
    </span>
  );
}
