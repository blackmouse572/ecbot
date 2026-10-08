import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IResetPasswordEmailCopy {
    subject: string;
    greeting: (name?: string) => string;
    intro: string;
    action: string;
    pasteLink: string;
    expires: (expiredAt: string) => string;
    ignore: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IResetPasswordEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: `Reset your ${homeName} password`,
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: 'We got a request to reset your password. Open this link to choose a new one:',
        action: 'Choose a new password',
        pasteLink: 'Or paste this link into your browser:',
        expires: expiredAt => `The link expires at ${expiredAt}.`,
        ignore: 'If you did not ask for this, ignore this email. Your password stays the same.',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: `Đặt lại mật khẩu ${homeName}`,
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn. Mở liên kết này để chọn mật khẩu mới:',
        action: 'Chọn mật khẩu mới',
        pasteLink: 'Hoặc dán liên kết này vào trình duyệt:',
        expires: expiredAt => `Liên kết hết hạn lúc ${expiredAt}.`,
        ignore: 'Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu của bạn không thay đổi.',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The reset-password email's wording in the user's language, English otherwise. */
export const resetPasswordEmailCopy = (
    language: string | undefined,
    homeName: string
): IResetPasswordEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
