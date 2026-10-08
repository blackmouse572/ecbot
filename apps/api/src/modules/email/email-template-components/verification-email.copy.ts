import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IVerificationEmailCopy {
    subject: string;
    heading: string;
    greeting: (name?: string) => string;
    intro: string;
    expires: (expiredAt: string) => string;
    reference: string;
    support: string;
    ignore: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IVerificationEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: 'Email Verification',
        heading: 'Verify your email',
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: 'Use this code to verify your email address:',
        expires: expiredAt => `The code expires at ${expiredAt}.`,
        reference: 'Reference',
        support: 'Questions? Write to',
        ignore: 'If you did not sign up, you can ignore this email.',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: 'Mã xác minh email của bạn',
        heading: 'Xác minh email của bạn',
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: 'Dùng mã này để xác minh địa chỉ email của bạn:',
        expires: expiredAt => `Mã hết hạn lúc ${expiredAt}.`,
        reference: 'Mã tham chiếu',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        ignore: 'Nếu bạn không đăng ký, hãy bỏ qua email này.',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The verification email's wording in the user's language, English otherwise. */
export const verificationEmailCopy = (
    language: string | undefined,
    homeName: string
): IVerificationEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
