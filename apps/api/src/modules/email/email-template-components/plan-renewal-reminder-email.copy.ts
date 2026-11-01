import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IPlanRenewalReminderEmailCopy {
    subject: (
        planName: string,
        workspaceName: string,
        endsAt: string
    ) => string;
    heading: string;
    greeting: (name?: string) => string;
    /** Pieces of one sentence, so the template can bold the facts. */
    intro: <T>(planName: T, workspaceName: T, endsAt: T) => (string | T)[];
    impact: string;
    howToPay: string;
    action: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IPlanRenewalReminderEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: (planName, workspaceName, endsAt) =>
            `Your ${planName} plan for ${workspaceName} ends on ${endsAt}`,
        heading: 'Time to renew your plan',
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: (planName, workspaceName, endsAt) => [
            'The ',
            planName,
            ' plan for ',
            workspaceName,
            ' is paid until ',
            endsAt,
            '.',
        ],
        impact: 'After that, the workspace moves to the free plan and your chatbots answer within its smaller token quota.',
        howToPay:
            'Renew with a bank transfer or a card. You can also pick another plan for the next period.',
        action: 'Renew plan',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: (planName, workspaceName, endsAt) =>
            `Gói ${planName} của ${workspaceName} hết hạn vào ${endsAt}`,
        heading: 'Đã đến lúc gia hạn gói',
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: (planName, workspaceName, endsAt) => [
            'Gói ',
            planName,
            ' của ',
            workspaceName,
            ' đã được thanh toán đến ',
            endsAt,
            '.',
        ],
        impact: 'Sau thời điểm đó, workspace chuyển về gói miễn phí và chatbot chỉ trả lời trong hạn mức token nhỏ hơn của gói này.',
        howToPay:
            'Bạn có thể gia hạn bằng chuyển khoản hoặc thẻ, và chọn gói khác cho kỳ tiếp theo nếu muốn.',
        action: 'Gia hạn gói',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The renewal reminder's wording, English when the language is unknown. */
export const planRenewalReminderEmailCopy = (
    language: string | undefined,
    homeName: string
): IPlanRenewalReminderEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
