import { welcomeEmailCopy } from '@app/modules/email/email-template-components/welcome-email.copy';

describe('welcomeEmailCopy', () => {
    it('writes Vietnamese for vi and points at connecting a channel', () => {
        const copy = welcomeEmailCopy('vi', 'Ecbot');

        expect(copy.subject('Linh')).toBe(
            'Linh ơi, còn 1 bước là bot trả lời khách được rồi'
        );
        expect(copy.greeting('Linh')).toBe('Chào Linh,');
        expect(copy.action).toBe('Nối fanpage ngay');
        expect(copy.signOff).toBe('Đội ngũ Ecbot');
    });

    it('falls back to English for an unknown language', () => {
        const copy = welcomeEmailCopy('fr', 'Ecbot');

        expect(copy.subject('Linh')).toBe(
            'Linh, one step left before your bot can reply'
        );
        expect(copy.signOff).toBe('The Ecbot team');
    });

    it('reads naturally without a name', () => {
        expect(welcomeEmailCopy('vi', 'Ecbot').subject()).toBe(
            'Còn 1 bước là bot trả lời khách được rồi'
        );
        expect(welcomeEmailCopy('en', 'Ecbot').greeting()).toBe('Hi,');
    });

    // Marketing rule: no setup-time numbers until a timed recording backs one.
    it('promises no setup time', () => {
        for (const language of ['vi', 'en']) {
            const copy = welcomeEmailCopy(language, 'Ecbot');
            const text = [copy.preview, copy.intro, copy.help].join(' ');

            expect(text).not.toMatch(/\d+\s*(phút|minutes?)/i);
        }
    });
});
