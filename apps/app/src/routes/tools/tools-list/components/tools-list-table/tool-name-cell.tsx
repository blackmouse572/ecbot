import type { ToolListResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { useToolLogo } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ToolLogo } from "../../../components/tool-logo";
import { toolSource } from "./tool-source";

type ToolNameCellProps = {
  tool: ToolListResponseDto & { displayName?: string };
};

export const ToolNameCell = ({ tool }: ToolNameCellProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { logo, isLoading } = useToolLogo(workspaceSlug, tool);
  const name = tool.displayName ?? tool.name;
  const { ready, host } = toolSource(tool);

  const source = [
    t(ready ? "tools.list.source.ready" : "tools.list.source.custom"),
    host,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-x-2">
      <ToolLogo name={name} logo={logo} isLoading={isLoading} size="small" />
      <div className="flex flex-col gap-y-0.5 min-w-0">
        <span className="txt-compact-small font-medium truncate">{name}</span>
        <span className="txt-compact-xsmall text-ui-fg-subtle truncate">
          {source}
        </span>
      </div>
    </div>
  );
};
