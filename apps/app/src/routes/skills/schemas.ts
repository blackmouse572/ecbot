import type { SkillStep } from "@repo/agent-blueprint";
import * as z from "zod/v4";

export const skillFormSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    // "When to use": the trigger the agent reads to decide to load the skill.
    description: z.string().trim().min(1).max(500),
    guardrails: z.array(z.object({ value: z.string().max(500) })).max(20),
    format: z.enum(["CONTENT", "STEPS"]),
    instructions: z.string(),
    // Read only until the steps editor lands: kept as the skill has them.
    steps: z.array(z.custom<SkillStep>()),
    // The compiled body of a STEPS skill, used when it is switched to text.
    compiled: z.string(),
  })
  .refine((v) => v.format !== "CONTENT" || v.instructions.trim().length > 0, {
    path: ["instructions"],
    message: "Required",
  });

export type SkillFormData = z.infer<typeof skillFormSchema>;
