import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

/** `create`: an admin made the account. `reset`: an admin reset the password. */
export type AdminPasswordEmailKind = 'create' | 'reset';

export interface IAdminPasswordEmailCopy {
    subject: string;
    heading: string;
    greeting: (name?: string) => string;
    intro: string;
    expires: (expiredAt: string) => string;
    action: string;
    // Only for a new account: the first sign-in asks for the emailed code.
    verifyNote?: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (
        homeName: string
    ) => Record<AdminPasswordEmailKind, IAdminPasswordEmailCopy>
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => {
        const shared = {
            greeting: (name?: string) => (name ? `Hi ${name},` : 'Hi,'),
            expires: (expiredAt: string) =>
                `This password expires at ${expiredAt}, so change it after you sign in.`,
            action: 'Sign in',
            support: 'Questions? Write to',
            signOff: `The ${homeName} team`,
        };
        return {
            create: {
                ...shared,
                subject: `Your ${homeName} account is ready`,
                heading: 'Your account is ready',
                intro: `An admin created a ${homeName} account for you. Sign in with this email address and this temporary password:`,
                verifyNote:
                    'The first time you sign in, we will ask for the code from our verification email.',
            },
            reset: {
                ...shared,
                subject: `Your new ${homeName} password`,
                heading: 'Your password was reset',
                intro: 'An admin reset your password. Sign in with this temporary password:',
            },
        };
    },
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => {
        const shared = {
            greeting: (name?: string) => (name ? `Chào ${name},` : 'Chào bạn,'),
            expires: (expiredAt: string) =>
                `Mật khẩu này hết hạn lúc ${expiredAt}, vì vậy hãy đổi mật khẩu sau khi đăng nhập.`,
            action: 'Đăng nhập',
            support: 'Cần hỗ trợ? Hãy gửi email tới',
            signOff: `Đội ngũ ${homeName}`,
        };
        return {
            create: {
                ...shared,
                subject: `Tài khoản ${homeName} của bạn đã sẵn sàng`,
                heading: 'Tài khoản của bạn đã sẵn sàng',
                intro: `Quản trị viên đã tạo cho bạn một tài khoản ${homeName}. Hãy đăng nhập bằng địa chỉ email này và mật khẩu tạm thời bên dưới:`,
                verifyNote:
                    'Lần đầu đăng nhập, bạn sẽ được yêu cầu nhập mã trong email xác minh chúng tôi gửi kèm.',
            },
            reset: {
                ...shared,
                subject: `Mật khẩu mới cho ${homeName}`,
                heading: 'Mật khẩu của bạn đã được đặt lại',
                intro: 'Quản trị viên đã đặt lại mật khẩu của bạn. Hãy đăng nhập bằng mật khẩu tạm thời này:',
            },
        };
    },
};

/** The admin password email's wording in the user's language, English otherwise. */
export const adminPasswordEmailCopy = (
    kind: AdminPasswordEmailKind,
    language: string | undefined,
    homeName: string
): IAdminPasswordEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    )[kind];
