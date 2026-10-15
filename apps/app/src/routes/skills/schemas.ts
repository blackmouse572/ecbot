import { validateSkillSteps, type SkillStep } from "@repo/agent-blueprint";
import * as z from "zod/v4";

export const skillFormSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    // "When to use": the trigger the agent reads to decide to load the skill.
    description: z.string().trim().min(1).max(500),
    guardrails: z.array(z.object({ value: z.string().max(500) })).max(20),
    format: z.enum(["CONTENT", "STEPS"]),
    instructions: z.string(),
    steps: z.array(z.custom<SkillStep>()),
  })
  .refine((v) => v.format !== "CONTENT" || v.instructions.trim().length > 0, {
    path: ["instructions"],
    message: "Required",
  })
  // Each issue shows on its step; this only blocks the save.
  .refine((v) => v.format !== "STEPS" || !validateSkillSteps(v.steps).length, {
    path: ["steps"],
    message: "Invalid",
  });

export type SkillFormData = z.infer<typeof skillFormSchema>;
