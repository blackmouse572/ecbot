import { isDeepStrictEqual } from 'node:util';
import { compileSkill, type SkillStep } from '@repo/agent-blueprint';
import { BUILTIN_SKILLS } from 'src/modules/skill/constants/builtin-skills.constant';
import { BUILTIN_SKILLS_VI } from 'src/modules/skill/constants/builtin-skills.vi.constant';
import type { BuiltinSkillTranslation } from 'src/modules/skill/interfaces/builtin-skill.interface';

const TRANSLATIONS: Record<string, Record<string, BuiltinSkillTranslation>> = {
    vi: BUILTIN_SKILLS_VI,
};

interface ILocalizableSkill {
    slug: string;
    name: string;
    description?: string | null;
    guardrails?: string[] | null;
    steps?: SkillStep[] | null;
    workspace?: unknown;
}

const translateSteps = (
    steps: SkillStep[],
    text: Record<string, string>
): SkillStep[] =>
    steps.map(step => {
        if (step.type === 'if') {
            return {
                ...step,
                branches: step.branches.map(b => ({
                    ...b,
                    condition: text[b.id] ?? b.condition,
                    steps: translateSteps(b.steps, text),
                })),
                ...(step.otherwise && {
                    otherwise: translateSteps(step.otherwise, text),
                }),
            };
        }
        return text[step.id] ? { ...step, text: text[step.id] } : step;
    });

// A builtin template in the reader's language. Only a template still as
// seeded is translated: an admin's edits have no translation to match.
export const localizeBuiltinSkill = (
    skill: ILocalizableSkill,
    language?: string
) => {
    if (skill.workspace || !language) return undefined;
    const tr = TRANSLATIONS[language.split('-')[0]]?.[skill.slug];
    const def = BUILTIN_SKILLS.find(t => t.slug === skill.slug);
    if (!tr || !def) return undefined;
    const asSeeded = isDeepStrictEqual(
        {
            name: skill.name,
            description: skill.description,
            guardrails: skill.guardrails,
            steps: skill.steps,
        },
        {
            name: def.name,
            description: def.description,
            guardrails: def.guardrails,
            steps: def.steps,
        }
    );
    if (!asSeeded) return undefined;
    const steps = translateSteps(def.steps, tr.text);
    return {
        name: tr.name,
        description: tr.description,
        guardrails: tr.guardrails,
        steps,
        instructions: compileSkill({
            name: tr.name,
            guardrails: tr.guardrails,
            format: 'STEPS',
            steps,
            toolName: () => undefined,
        }),
    };
};
