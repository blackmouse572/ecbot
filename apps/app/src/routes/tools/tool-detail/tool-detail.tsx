import {
  getToolkitSlug,
  useGetTool,
  useGetToolkitDetail,
} from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import { useParams } from "react-router-dom";
import {
  ToolDescriptionSection,
  ToolEndpointSection,
  ToolGeneralSection,
  ToolMetadataSection,
  ToolMcpSection,
} from "./components";

export function ToolDetail() {
  const { toolId } = useParams<{ toolId: string }>();
  const { workspaceSlug } = useWorkspaceParams();

  const { tool, isLoading, isError, error } = useGetTool(
    workspaceSlug,
    toolId ?? "",
    { enabled: !!toolId },
  );

  const toolkitSlug = getToolkitSlug(tool);
  const { toolkit } = useGetToolkitDetail(workspaceSlug, toolkitSlug ?? "", {
    enabled: !!toolkitSlug,
  });

  if (isLoading || !tool) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={1} />;
  }

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage>
      <TwoColumnPage hasOutlet={false}>
        <TwoColumnPage.Main>
          <ToolGeneralSection item={tool} />
          <ToolDescriptionSection item={tool} />
          {tool.kind === "HTTP" && <ToolEndpointSection item={tool} />}
          {tool.kind === "MCP" && (
            <ToolMcpSection item={tool} toolkit={toolkit} />
          )}
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <ToolMetadataSection item={tool} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </SingleColumnPage>
  );
}
