import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IWelcomeEmailCopy {
    subject: (name?: string) => string;
    preview: string;
    heading: string;
    greeting: (name?: string) => string;
    intro: string;
    action: string;
    help: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IWelcomeEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: name =>
            name
                ? `${name}, one step left before your bot can reply`
                : 'One step left before your bot can reply',
        preview: 'Connect your Facebook page so your bot can start replying.',
        heading: 'One step left',
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: `Thanks for signing up for ${homeName}. Your bot only starts replying once it is connected to a chat channel. Most shops connect their Facebook page first.`,
        action: 'Connect your page',
        help: 'Stuck on a step? Write to us and we will help you through it.',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: name =>
            name
                ? `${name} ơi, còn 1 bước là bot trả lời khách được rồi`
                : 'Còn 1 bước là bot trả lời khách được rồi',
        preview: 'Nối fanpage để bot bắt đầu trả lời khách.',
        heading: 'Còn 1 bước nữa thôi',
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: `Cảm ơn bạn đã đăng ký ${homeName}. Bot chỉ bắt đầu trả lời khi được nối với một kênh chat. Đa số shop nối fanpage trước.`,
        action: 'Nối fanpage ngay',
        help: 'Kẹt ở bước nào thì bạn cứ gửi email cho mình, mình hỗ trợ.',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The welcome email's wording, English when the language is unknown. */
export const welcomeEmailCopy = (
    language: string | undefined,
    homeName: string
): IWelcomeEmailCopy =>
    // SAFETY: an unknown language misses the lookup and falls back to English.
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
