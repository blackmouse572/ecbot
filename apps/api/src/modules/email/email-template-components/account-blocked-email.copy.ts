import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IAccountBlockedEmailCopy {
    subject: (accountName: string) => string;
    heading: string;
    greeting: (name?: string) => string;
    intro: (accountName: string) => string;
    impact: string;
    action: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IAccountBlockedEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: accountName => `Reconnect ${accountName}`,
        heading: 'A channel was disconnected',
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: accountName =>
            `We could not refresh the connection to ${accountName}, so it has been disconnected.`,
        impact: 'Until you reconnect it, your agent cannot read or answer messages on this channel.',
        action: 'Reconnect the channel',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: accountName => `Kết nối lại ${accountName}`,
        heading: 'Một kênh đã bị ngắt kết nối',
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: accountName =>
            `Chúng tôi không làm mới được kết nối tới ${accountName}, nên kênh này đã bị ngắt kết nối.`,
        impact: 'Cho đến khi bạn kết nối lại, trợ lý không thể đọc hay trả lời tin nhắn trên kênh này.',
        action: 'Kết nối lại kênh',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The channel-disconnected email's wording, English when the language is unknown. */
export const accountBlockedEmailCopy = (
    language: string | undefined,
    homeName: string
): IAccountBlockedEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
