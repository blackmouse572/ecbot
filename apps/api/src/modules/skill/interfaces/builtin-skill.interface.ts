// A builtin template in another language. `text` maps each step or branch id
// to its text or condition; ids and step types stay those of the template.
export interface BuiltinSkillTranslation {
    name: string;
    description: string;
    guardrails: string[];
    text: Record<string, string>;
}
