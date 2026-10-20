import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IInvitationEmailCopy {
    subject: (inviterName: string, workspaceName: string) => string;
    heading: (workspaceName: string) => string;
    greeting: string;
    intro: (inviterName: string, workspaceName: string) => string;
    action: string;
    expiry: (expiresAt: string) => string;
    ignore: string;
    /** For an invitee with no account: sign up first, with the invited email. */
    noAccount: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IInvitationEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: (inviterName, workspaceName) =>
            `${inviterName} invited you to ${workspaceName} on ${homeName}`,
        heading: workspaceName => `Join ${workspaceName}`,
        greeting: 'Hi,',
        intro: (inviterName, workspaceName) =>
            `${inviterName} invited you to join ${workspaceName} on ${homeName}.`,
        action: 'Accept invitation',
        expiry: expiresAt => `The invitation is valid until ${expiresAt}.`,
        ignore: "If you weren't expecting this invitation, you can ignore this email.",
        noAccount:
            'No account yet? Tap the button above, then choose Sign up with this same email.',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: (inviterName, workspaceName) =>
            `${inviterName} đã mời bạn tham gia ${workspaceName} trên ${homeName}`,
        heading: workspaceName => `Tham gia ${workspaceName}`,
        greeting: 'Chào bạn,',
        intro: (inviterName, workspaceName) =>
            `${inviterName} đã mời bạn tham gia ${workspaceName} trên ${homeName}.`,
        action: 'Chấp nhận lời mời',
        expiry: expiresAt => `Lời mời có hiệu lực đến ${expiresAt}.`,
        ignore: 'Nếu bạn không mong đợi lời mời này, bạn có thể bỏ qua email này.',
        noAccount:
            'Chưa có tài khoản? Bấm nút ở trên, rồi chọn Đăng ký bằng chính email này.',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The invitation email's wording, English when the language is unknown. */
export const invitationEmailCopy = (
    language: string | undefined,
    homeName: string
): IInvitationEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );

const SUBJECT_NAME_MAX = 60;

/**
 * Names people choose go into the subject of mail sent from our domain, so a
 * long one is cut short rather than filling the inbox line (#247 review).
 */
export const capSubjectName = (name: string): string =>
    name.length > SUBJECT_NAME_MAX
        ? `${name.slice(0, SUBJECT_NAME_MAX - 1)}…`
        : name;
