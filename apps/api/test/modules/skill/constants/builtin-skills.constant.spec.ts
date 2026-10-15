import { validateSkillSteps } from '@repo/agent-blueprint';
import { BUILTIN_SKILLS } from '../../../../src/modules/skill/constants/builtin-skills.constant';

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
