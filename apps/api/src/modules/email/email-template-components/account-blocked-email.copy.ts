import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

/**
 * Why the channel needs attention: the hourly token refresh failed (the
 * default), the platform rejected our token on send, or sends keep failing.
 */
export type AccountBlockedReason =
    'refresh_failed' | 'auth_failed' | 'send_failing';

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

type IReasonCopy = Pick<
    IAccountBlockedEmailCopy,
    'subject' | 'heading' | 'intro' | 'impact' | 'action'
>;

// Overrides of the refresh_failed wording for the send-time reasons.
const REASON_COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    Record<Exclude<AccountBlockedReason, 'refresh_failed'>, IReasonCopy>
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: {
        auth_failed: {
            subject: accountName => `Reconnect ${accountName}`,
            heading: 'A channel lost its connection',
            intro: accountName =>
                `${accountName} rejected our last reply: its access was revoked or has expired.`,
            impact: 'Until you reconnect it, your agent cannot answer messages on this channel.',
            action: 'Reconnect the channel',
        },
        send_failing: {
            subject: accountName => `Replies on ${accountName} are failing`,
            heading: 'A channel is not delivering replies',
            intro: accountName =>
                `Replies on ${accountName} have failed to send several times in a row.`,
            impact: 'Customers on this channel are not getting answers right now. We will tell you when it works again.',
            action: 'Check the channel',
        },
    },
    [ENUM_MESSAGE_LANGUAGE.VI]: {
        auth_failed: {
            subject: accountName => `Kết nối lại ${accountName}`,
            heading: 'Một kênh đã mất kết nối',
            intro: accountName =>
                `${accountName} đã từ chối tin trả lời gần nhất vì quyền truy cập đã bị thu hồi hoặc hết hạn.`,
            impact: 'Cho đến khi bạn kết nối lại, trợ lý không thể trả lời tin nhắn trên kênh này.',
            action: 'Kết nối lại kênh',
        },
        send_failing: {
            subject: accountName =>
                `Tin trả lời trên ${accountName} đang gửi thất bại`,
            heading: 'Một kênh đang không gửi được tin',
            intro: accountName =>
                `Tin trả lời trên ${accountName} đã gửi thất bại nhiều lần liên tiếp.`,
            impact: 'Khách trên kênh này đang không nhận được câu trả lời. Chúng tôi sẽ báo bạn khi kênh hoạt động lại.',
            action: 'Kiểm tra kênh',
        },
    },
};

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
    homeName: string,
    reason: AccountBlockedReason = 'refresh_failed'
): IAccountBlockedEmailCopy => {
    const lang = COPY[language as ENUM_MESSAGE_LANGUAGE]
        ? (language as ENUM_MESSAGE_LANGUAGE)
        : ENUM_MESSAGE_LANGUAGE.EN;
    const base = COPY[lang](homeName);
    return reason === 'refresh_failed'
        ? base
        : { ...base, ...REASON_COPY[lang][reason] };
};
