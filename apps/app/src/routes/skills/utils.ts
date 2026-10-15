import type {
  CreateSkillRequestDto,
  SkillGetResponseDto,
  SkillUsageToolResponseDto,
} from "@repo/client";
import type { SkillStep, ToolStep } from "@repo/agent-blueprint";
import type { SkillFormData } from "./schemas";

export const EMPTY_SKILL_FORM: SkillFormData = {
  name: "",
  description: "",
  guardrails: [],
  format: "CONTENT",
  instructions: "",
  steps: [],
  compiled: "",
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
    compiled: steps ? (skill.instructions ?? "") : "",
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
