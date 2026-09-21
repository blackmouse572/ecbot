import { Badge } from "@medusajs/ui";
import type { ToolListResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { useToolLogo } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ToolLogo } from "../../../components/tool-logo";

type ToolNameCellProps = {
  tool: ToolListResponseDto & { displayName?: string };
};

export const ToolNameCell = ({ tool }: ToolNameCellProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { logo, isLoading } = useToolLogo(workspaceSlug, tool);
  const isMcp = tool.kind === "MCP";
  const name = tool.displayName ?? tool.name;

  return (
    <div className="flex items-center gap-x-2">
      {/* Only real toolkit logos get an avatar — no initials placeholder
          for HTTP tools / custom MCP tools with no resolvable toolkit. */}
      {(isLoading || logo) && (
        <ToolLogo name={name} logo={logo} isLoading={isLoading} size="small" />
      )}
      <div className="flex flex-col gap-y-0.5 min-w-0">
        <div className="flex items-center gap-x-1.5">
          <span className="txt-compact-small font-medium truncate">{name}</span>
          <Badge
            size="2xsmall"
            color={tool.kind === "HTTP" ? "blue" : "purple"}
          >
            {t(`tools.list.filters.kindOptions.${tool.kind}`, {
              defaultValue: tool.kind,
            })}
          </Badge>
        </div>
        {!isMcp && tool.description && (
          <span className="txt-compact-xsmall text-ui-fg-subtle line-clamp-1">
            {tool.description}
          </span>
        )}
      </div>
    </div>
  );
};
