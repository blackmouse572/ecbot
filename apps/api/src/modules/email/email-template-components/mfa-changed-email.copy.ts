import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IMfaChangedEmailCopy {
    subject: (enabled: boolean) => string;
    greeting: (name?: string) => string;
    intro: (enabled: boolean) => string;
    sessions: string;
    warning: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IMfaChangedEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: enabled =>
            enabled
                ? 'Two-step verification is on'
                : 'Two-step verification is off',
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: enabled =>
            enabled
                ? `Two-step verification was just turned on for your ${homeName} account. Each sign-in now asks for a code from your authenticator app.`
                : `Two-step verification was just turned off for your ${homeName} account. Signing in now needs only your password.`,
        sessions: 'For your safety, we signed you out on your other devices.',
        warning:
            'If you did not make this change, reset your password right away and contact us.',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: enabled =>
            enabled ? 'Đã bật xác minh hai bước' : 'Đã tắt xác minh hai bước',
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: enabled =>
            enabled
                ? `Tài khoản ${homeName} của bạn vừa bật xác minh hai bước. Từ giờ, mỗi lần đăng nhập bạn sẽ nhập thêm mã từ ứng dụng xác thực.`
                : `Tài khoản ${homeName} của bạn vừa tắt xác minh hai bước. Từ giờ, bạn chỉ cần mật khẩu để đăng nhập.`,
        sessions:
            'Để bảo vệ tài khoản, chúng tôi đã đăng xuất bạn khỏi các thiết bị khác.',
        warning:
            'Nếu bạn không thực hiện thay đổi này, hãy đặt lại mật khẩu ngay và liên hệ với chúng tôi.',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The two-step verification email's wording, English when the language is unknown. */
export const mfaChangedEmailCopy = (
    language: string | undefined,
    homeName: string
): IMfaChangedEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
