import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IMemberJoinedEmailCopy {
    subject: (memberName: string, workspaceName: string) => string;
    heading: (workspaceName: string) => string;
    greeting: (name?: string) => string;
    intro: (memberName: string, workspaceName: string) => string;
    action: string;
    why: (workspaceName: string) => string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IMemberJoinedEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: (memberName, workspaceName) =>
            `${memberName} joined ${workspaceName}`,
        heading: workspaceName => `New member in ${workspaceName}`,
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: (memberName, workspaceName) =>
            `${memberName} has joined ${workspaceName}.`,
        action: 'View members',
        why: workspaceName =>
            `You get this email because you own ${workspaceName}.`,
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: (memberName, workspaceName) =>
            `${memberName} đã tham gia ${workspaceName}`,
        heading: workspaceName => `Thành viên mới trong ${workspaceName}`,
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: (memberName, workspaceName) =>
            `${memberName} đã tham gia ${workspaceName}.`,
        action: 'Xem thành viên',
        why: workspaceName =>
            `Bạn nhận được email này vì bạn là chủ sở hữu ${workspaceName}.`,
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The new-member email's wording, English when the language is unknown. */
export const memberJoinedEmailCopy = (
    language: string | undefined,
    homeName: string
): IMemberJoinedEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
