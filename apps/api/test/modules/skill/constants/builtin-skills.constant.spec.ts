import { validateSkillSteps, type SkillStep } from '@repo/agent-blueprint';
import { BUILTIN_SKILLS } from '../../../../src/modules/skill/constants/builtin-skills.constant';
import { BUILTIN_SKILLS_VI } from '../../../../src/modules/skill/constants/builtin-skills.vi.constant';

describe('BUILTIN_SKILLS', () => {
    it('has unique slugs', () => {
        const slugs = BUILTIN_SKILLS.map(t => t.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
    });

    it.each(BUILTIN_SKILLS.map(t => [t.slug, t]))(
        '%s has valid steps that use no workspace tools',
        (_slug, template) => {
            expect(
                validateSkillSteps(template.steps, {
                    toolName: () => undefined,
                })
            ).toEqual([]);
        }
    );
});

describe('BUILTIN_SKILLS_VI', () => {
    const textIds = (steps: SkillStep[]): string[] =>
        steps.flatMap(s => {
            if (s.type === 'if') {
                return [
                    ...s.branches.flatMap(b => [b.id, ...textIds(b.steps)]),
                    ...textIds(s.otherwise ?? []),
                ];
            }
            return s.type === 'tool' && !s.text ? [] : [s.id];
        });

    it.each(BUILTIN_SKILLS.map(t => [t.slug, t]))(
        '%s is translated in full',
        (slug, template) => {
            const vi = BUILTIN_SKILLS_VI[slug as string];
            expect(vi).toBeDefined();
            expect(vi.guardrails).toHaveLength(template.guardrails.length);
            expect(Object.keys(vi.text).sort()).toEqual(
                textIds(template.steps).sort()
            );
        }
    );
});
