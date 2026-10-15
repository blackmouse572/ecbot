import type {
  CreateSkillRequestDto,
  SkillGetResponseDto,
  SkillUsageToolResponseDto,
  ToolListResponseDto,
} from "@repo/client";
import type {
  SkillStep,
  SkillToolNamer,
  ToolStep,
} from "@repo/agent-blueprint";
import type { SkillFormData } from "./schemas";

export const EMPTY_SKILL_FORM: SkillFormData = {
  name: "",
  description: "",
  guardrails: [],
  format: "CONTENT",
  instructions: "",
  steps: [],
};

export const skillToFormValues = (
  skill: SkillGetResponseDto,
): SkillFormData => {
  const steps = skill.format === "STEPS";
  return {
    name: skill.name,
    description: skill.description ?? "",
    guardrails: (skill.guardrails ?? []).map((value) => ({ value })),
    format: skill.format,
    instructions: steps ? "" : (skill.instructions ?? ""),
    steps: steps ? ((skill.steps ?? []) as SkillStep[]) : [],
  };
};

export const formValuesToBody = (
  data: SkillFormData,
): CreateSkillRequestDto => ({
  name: data.name.trim(),
  description: data.description.trim(),
  guardrails: data.guardrails.map((g) => g.value.trim()).filter(Boolean),
  format: data.format,
  ...(data.format === "STEPS"
    ? { steps: data.steps as CreateSkillRequestDto["steps"] }
    : { instructions: data.instructions }),
});

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
  (tools: ToolListResponseDto[] = []): SkillToolNamer =>
  ({ toolId, action }) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return undefined;
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (tool.kind === "HTTP") return clean(tool.slug);
    return action ? clean(action) : undefined;
  };
