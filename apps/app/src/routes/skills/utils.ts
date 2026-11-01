import type {
  SkillUsageToolResponseDto,
  ToolListResponseDto,
} from "@repo/client";
import type { SkillToolNamer, ToolStep } from "@repo/agent-blueprint";

// Names a Tool step by the workspace tool it calls ("Zendesk · create_ticket").
export const toolLabelOf =
  (tools?: SkillUsageToolResponseDto[]) =>
  ({ toolId, action }: Pick<ToolStep, "toolId" | "action">) => {
    const tool = tools?.find((t) => t.id === toolId);
    if (!tool) return action ?? "";
    return action ? `${tool.name} · ${action}` : tool.name;
  };

// The function name the agent calls a Tool step by (same rule as the API's
// compiler: HTTP tools by slug, MCP tools by action).
export const toolNameOf =
  (
    tools: Pick<ToolListResponseDto, "id" | "kind" | "slug">[] = [],
  ): SkillToolNamer =>
  ({ toolId, action }) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return undefined;
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (tool.kind === "HTTP") return clean(tool.slug);
    return action ? clean(action) : undefined;
  };
