import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface ILowTokenBalanceEmailCopy {
    subject: (workspaceName: string, usedPercent: number) => string;
    heading: (usedPercent: number) => string;
    greeting: (name?: string) => string;
    intro: (workspaceName: string, usedPercent: number) => string;
    impact: (renewsAt: string) => string;
    action: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => ILowTokenBalanceEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: (workspaceName, usedPercent) =>
            `${workspaceName} has used ${usedPercent}% of its token quota`,
        heading: usedPercent => `${usedPercent}% of your tokens are used`,
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: (workspaceName, usedPercent) =>
            `${workspaceName} has used ${usedPercent}% of its token quota for this period.`,
        impact: renewsAt =>
            `Your quota renews on ${renewsAt}. If it runs out before then, your chatbots stop replying until you top up or upgrade.`,
        action: 'Check usage',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: (workspaceName, usedPercent) =>
            `${workspaceName} đã dùng ${usedPercent}% token của kỳ này`,
        heading: usedPercent => `Bạn đã dùng ${usedPercent}% token`,
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: (workspaceName, usedPercent) =>
            `${workspaceName} đã dùng ${usedPercent}% hạn mức token của kỳ này.`,
        impact: renewsAt =>
            `Hạn mức được làm mới vào ${renewsAt}. Nếu hết trước đó, chatbot sẽ ngừng trả lời cho đến khi bạn nạp thêm token hoặc nâng cấp gói.`,
        action: 'Xem mức sử dụng',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The low-token email's wording, English when the language is unknown. */
export const lowTokenBalanceEmailCopy = (
    language: string | undefined,
    homeName: string
): ILowTokenBalanceEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
