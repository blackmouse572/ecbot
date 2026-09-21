import * as z from "zod/v4";

export const skillFormSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional().or(z.literal("")),
  instructions: z.string().min(1),
});

export type SkillFormData = z.infer<typeof skillFormSchema>;
