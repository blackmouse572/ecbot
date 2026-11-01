import type { SkillStep } from "@repo/agent-blueprint";
import type { SkillFormData } from "./schemas";

// The skill as the API returns it, as far as the form reads it.
export type SkillFormSource = {
  name: string;
  description?: string | null;
  guardrails?: string[] | null;
  format: "CONTENT" | "STEPS";
  instructions?: string | null;
  steps?: unknown[] | null;
};

export const EMPTY_SKILL_FORM: SkillFormData = {
  name: "",
  description: "",
  guardrails: [],
  format: "CONTENT",
  instructions: "",
  steps: [],
};

export const skillToFormValues = (skill: SkillFormSource): SkillFormData => {
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

// The create / update body: a skill sends `instructions` or `steps`, never both.
export const formValuesToBody = (data: SkillFormData) => ({
  name: data.name.trim(),
  description: data.description.trim(),
  guardrails: data.guardrails.map((g) => g.value.trim()).filter(Boolean),
  format: data.format,
  ...(data.format === "STEPS"
    ? { steps: data.steps as { [key: string]: unknown }[] }
    : { instructions: data.instructions }),
});
