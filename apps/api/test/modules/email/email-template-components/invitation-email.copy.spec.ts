import { invitationEmailCopy } from '@app/modules/email/email-template-components/invitation-email.copy';

// #185: the invitation was English-only, named neither the workspace nor the
// inviter, and signed off with an em dash.
describe('invitation email copy', () => {
    it('names the inviter and the workspace, in the inviter language', () => {
        expect(
            invitationEmailCopy('en', 'Ecbot').subject('Chi Nguyen', 'Kunmart')
        ).toBe('Chi Nguyen invited you to Kunmart on Ecbot');
        expect(
            invitationEmailCopy('vi', 'Ecbot').intro('Chi Nguyen', 'Kunmart')
        ).toBe('Chi Nguyen đã mời bạn tham gia Kunmart trên Ecbot.');
    });

    it('tells a new invitee to sign up with this email, in words true for existing users too', () => {
        expect(invitationEmailCopy('vi', 'Ecbot').newHere).toBe(
            'Lần đầu dùng Ecbot? Bấm nút ở trên, rồi chọn Đăng ký bằng chính email này.'
        );
        expect(invitationEmailCopy('en', 'Ecbot').newHere).toBe(
            'New to Ecbot? Tap the button above, then choose Sign up with this same email.'
        );
    });

    it('falls back to English and never uses an em dash', () => {
        for (const language of ['en', 'vi', 'fr']) {
            const copy = invitationEmailCopy(language, 'Ecbot');
            const text = [
                copy.subject('Chi', 'Kunmart'),
                copy.heading('Kunmart'),
                copy.intro('Chi', 'Kunmart'),
                copy.action,
                copy.expiry('10/10/2026'),
                copy.ignore,
                copy.newHere,
                copy.signOff,
            ].join(' ');
            expect(text).not.toContain('—');
        }
        expect(invitationEmailCopy('fr', 'Ecbot').action).toBe(
            'Accept invitation'
        );
    });
});
