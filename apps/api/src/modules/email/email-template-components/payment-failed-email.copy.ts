import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IPaymentFailedEmailCopy {
    subject: (
        workspaceName: string,
        stopsAt: string,
        reminder: boolean
    ) => string;
    heading: (reminder: boolean) => string;
    greeting: (name?: string) => string;
    intro: (workspaceName: string, reminder: boolean) => string;
    impact: (stopsAt: string) => string;
    recovery: string;
    action: string;
    support: string;
    signOff: string;
}

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IPaymentFailedEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: (workspaceName, stopsAt, reminder) =>
            reminder
                ? `${workspaceName}: chatbots stop answering on ${stopsAt}`
                : `Payment failed for ${workspaceName}`,
        heading: reminder =>
            reminder
                ? 'Your chatbots stop answering soon'
                : 'Your payment did not go through',
        greeting: name => (name ? `Hi ${name},` : 'Hi,'),
        intro: (workspaceName, reminder) =>
            reminder
                ? `The renewal payment for ${workspaceName} still has not gone through.`
                : `We could not charge the renewal for ${workspaceName}. This usually happens when a card expires or the bank declines the charge.`,
        impact: stopsAt =>
            `Your chatbots keep answering customers until ${stopsAt}. After that, they stop replying until a payment goes through.`,
        recovery:
            'Once a payment goes through, your chatbots keep working with nothing else to do.',
        action: 'Update payment method',
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: (workspaceName, stopsAt, reminder) =>
            reminder
                ? `${workspaceName}: chatbot sẽ ngừng trả lời từ ${stopsAt}`
                : `Thanh toán cho ${workspaceName} chưa thành công`,
        heading: reminder =>
            reminder
                ? 'Chatbot của bạn sắp ngừng trả lời'
                : 'Thanh toán của bạn chưa thành công',
        greeting: name => (name ? `Chào ${name},` : 'Chào bạn,'),
        intro: (workspaceName, reminder) =>
            reminder
                ? `Khoản thanh toán gia hạn cho ${workspaceName} vẫn chưa thành công.`
                : `Chúng tôi chưa thu được phí gia hạn cho ${workspaceName}. Lỗi này thường xảy ra khi thẻ hết hạn hoặc ngân hàng từ chối giao dịch.`,
        impact: stopsAt =>
            `Chatbot vẫn trả lời khách hàng đến ${stopsAt}. Sau thời điểm đó, chatbot sẽ ngừng trả lời cho đến khi thanh toán thành công.`,
        recovery:
            'Khi thanh toán thành công, chatbot tiếp tục hoạt động bình thường, bạn không cần làm gì thêm.',
        action: 'Cập nhật phương thức thanh toán',
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The failed-payment email's wording, English when the language is unknown. */
export const paymentFailedEmailCopy = (
    language: string | undefined,
    homeName: string
): IPaymentFailedEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
