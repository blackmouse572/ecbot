import { planRenewalReminderEmailCopy } from '@app/modules/email/email-template-components/plan-renewal-reminder-email.copy';

describe('plan renewal reminder email copy', () => {
    const bold = (text: string) => ({ bold: text });

    it('intro keeps the plan, the workspace and the end date apart, so the email can bold them', () => {
        const vi = planRenewalReminderEmailCopy('vi', 'Ecbot');
        const en = planRenewalReminderEmailCopy('en', 'Ecbot');

        expect(
            vi.intro(bold('Growth'), bold('Kunmart'), bold('15 thg 12, 2026'))
        ).toEqual([
            'Gói ',
            { bold: 'Growth' },
            ' của ',
            { bold: 'Kunmart' },
            ' đã được thanh toán đến ',
            { bold: '15 thg 12, 2026' },
            '.',
        ]);
        expect(en.intro('Growth', 'Kunmart', 'Dec 15, 2026').join('')).toBe(
            'The Growth plan for Kunmart is paid until Dec 15, 2026.'
        );
    });
});
