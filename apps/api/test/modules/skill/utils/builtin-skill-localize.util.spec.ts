import { BUILTIN_SKILLS } from '../../../../src/modules/skill/constants/builtin-skills.constant';
import { localizeBuiltinSkill } from '../../../../src/modules/skill/utils/builtin-skill-localize.util';

describe('localizeBuiltinSkill', () => {
    const def = BUILTIN_SKILLS.find(t => t.slug === 'talk-to-a-person')!;
    const seeded = { ...def, workspace: null };

    it('translates a seeded template for a Vietnamese reader', () => {
        const vi = localizeBuiltinSkill(seeded, 'vi')!;
        expect(vi.name).toBe('Gặp nhân viên');
        expect(vi.guardrails).toEqual(['Không bao giờ giả vờ là người thật.']);
        expect(vi.steps[0]).toEqual({
            id: 'summary',
            type: 'ask',
            text: 'Tóm tắt ngắn khách cần gì, để nhân viên không phải hỏi lại.',
        });
        expect(vi.steps[1]).toEqual(def.steps[1]);
        expect(vi.instructions).toContain('# Gặp nhân viên');
        expect(vi.instructions).toContain('`apply_customer_tag`');
    });

    it('translates branch conditions and nested steps', () => {
        const order = BUILTIN_SKILLS.find(t => t.slug === 'order-status')!;
        const vi = localizeBuiltinSkill({ ...order, workspace: null }, 'vi')!;
        const branch = (vi.steps[2] as any).branches[0];
        expect(branch.condition).toBe('Đơn hàng bị giao trễ hoặc bị thất lạc.');
        expect(branch.steps[0].text).toBe(
            'Một lời xin lỗi ngắn vì sự chậm trễ.'
        );
    });

    it('leaves English, workspace skills and edited templates as stored', () => {
        expect(localizeBuiltinSkill(seeded, 'en')).toBeUndefined();
        expect(
            localizeBuiltinSkill({ ...seeded, workspace: { id: 'w' } }, 'vi')
        ).toBeUndefined();
        expect(
            localizeBuiltinSkill({ ...seeded, name: 'Talk to staff' }, 'vi')
        ).toBeUndefined();
    });
});
