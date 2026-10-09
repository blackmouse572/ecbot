import { verificationEmailCopy } from '@app/modules/email/email-template-components/verification-email.copy';

describe('verificationEmailCopy', () => {
    it('greets with a space before the name', () => {
        expect(verificationEmailCopy('en', 'Ecbot').greeting('Chi Huong')).toBe(
            'Hi Chi Huong,'
        );
    });

    it('writes Vietnamese for vi', () => {
        const copy = verificationEmailCopy('vi', 'Ecbot');

        expect(copy.greeting('Chi Huong')).toBe('Chào Chi Huong,');
        expect(copy.signOff).toBe('Đội ngũ Ecbot');
    });

    it('falls back to English for an unknown language', () => {
        expect(verificationEmailCopy('fr', 'Ecbot').signOff).toBe(
            'The Ecbot team'
        );
    });

    it('heads the email with what to do, in both languages', () => {
        expect(verificationEmailCopy('en', 'Ecbot').heading).toBe(
            'Verify your email'
        );
        expect(verificationEmailCopy('vi', 'Ecbot').heading).toBe(
            'Xác minh email của bạn'
        );
    });
});
