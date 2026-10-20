import { accountBlockedEmailCopy } from '@app/modules/email/email-template-components/account-blocked-email.copy';

describe('account blocked email copy', () => {
    it('keeps the refresh wording when no reason is given', () => {
        const vi = accountBlockedEmailCopy('vi', 'Ecbot');

        expect(vi.subject('Shop')).toBe('Kết nối lại Shop');
        expect(vi.intro('Shop')).toContain('không làm mới được kết nối');
    });

    it('says sends are failing for send_failing, in the chatbot language', () => {
        const vi = accountBlockedEmailCopy('vi', 'Ecbot', 'send_failing');
        const en = accountBlockedEmailCopy('en', 'Ecbot', 'send_failing');

        expect(vi.subject('Shop')).toBe(
            'Tin trả lời trên Shop đang gửi thất bại'
        );
        expect(vi.action).toBe('Kiểm tra kênh');
        expect(en.heading).toBe('A channel is not delivering replies');
        // Shared parts stay.
        expect(vi.signOff).toBe('Đội ngũ Ecbot');
    });

    it('asks to reconnect for auth_failed, English when the language is unknown', () => {
        const copy = accountBlockedEmailCopy('fr', 'Ecbot', 'auth_failed');

        expect(copy.subject('Shop')).toBe('Reconnect Shop');
        expect(copy.intro('Shop')).toContain('revoked');
    });
});
