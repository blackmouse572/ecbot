import { resetPasswordEmailCopy } from '@app/modules/email/email-template-components/reset-password-email.copy';

// #187 review: clients that strip styles or block links left nothing to copy,
// so the email also prints the link with this line above it.
describe('resetPasswordEmailCopy', () => {
    it('offers the link to paste, in English by default', () => {
        expect(resetPasswordEmailCopy(undefined, 'Ecbot').pasteLink).toBe(
            'Or paste this link into your browser:'
        );
    });

    it('offers the link to paste in Vietnamese', () => {
        expect(resetPasswordEmailCopy('vi', 'Ecbot').pasteLink).toBe(
            'Hoặc dán liên kết này vào trình duyệt:'
        );
    });

    it('heads the email with what to do, in both languages', () => {
        expect(resetPasswordEmailCopy('en', 'Ecbot').heading).toBe(
            'Reset your password'
        );
        expect(resetPasswordEmailCopy('vi', 'Ecbot').heading).toBe(
            'Đặt lại mật khẩu'
        );
    });
});
