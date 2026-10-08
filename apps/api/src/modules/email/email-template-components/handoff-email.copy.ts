import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface IHandoffEmailCopy {
    subject: (chatbotName: string) => string;
    heading: string;
    intro: (chatbotName: string) => string;
    reason: (reason: string) => string;
    paused: string;
    action: string;
    why: (workspaceName: string) => string;
    support: string;
    signOff: string;
}

// Same wording as the in-app handoff notification (notification.handoff.*).
const REASONS: Record<ENUM_MESSAGE_LANGUAGE, Record<string, string>> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: {
        keyword_trigger: 'The customer asked to talk to a staff member.',
        fallback_threshold:
            'The assistant could not answer several messages in a row.',
        tag_trigger: 'The customer was tagged as needing a staff member.',
        other: 'The assistant flagged a message it should not answer.',
    },
    [ENUM_MESSAGE_LANGUAGE.VI]: {
        keyword_trigger: 'Khách hàng muốn nói chuyện với nhân viên.',
        fallback_threshold:
            'Trợ lý không trả lời được nhiều tin nhắn liên tiếp.',
        tag_trigger: 'Khách hàng được gắn thẻ cần nhân viên hỗ trợ.',
        other: 'Trợ lý gặp một tin nhắn không nên tự trả lời.',
    },
};

const COPY: Record<
    ENUM_MESSAGE_LANGUAGE,
    (homeName: string) => IHandoffEmailCopy
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: homeName => ({
        subject: chatbotName => `A customer needs a person (${chatbotName})`,
        heading: 'A customer needs a person',
        intro: chatbotName =>
            `${chatbotName} handed a conversation over to your team.`,
        reason: reason => REASONS.en[reason] ?? REASONS.en.other,
        paused: 'The assistant has stopped replying in this conversation until someone turns it back on.',
        action: 'Open the conversation',
        why: workspaceName =>
            `You get this email because you can see conversations in ${workspaceName}.`,
        support: 'Questions? Write to',
        signOff: `The ${homeName} team`,
    }),
    [ENUM_MESSAGE_LANGUAGE.VI]: homeName => ({
        subject: chatbotName => `Khách hàng cần người hỗ trợ (${chatbotName})`,
        heading: 'Khách hàng cần người hỗ trợ',
        intro: chatbotName =>
            `${chatbotName} đã chuyển một cuộc hội thoại cho đội của bạn.`,
        reason: reason => REASONS.vi[reason] ?? REASONS.vi.other,
        paused: 'Trợ lý đã ngừng trả lời trong cuộc hội thoại này cho đến khi có người bật lại.',
        action: 'Mở cuộc hội thoại',
        why: workspaceName =>
            `Bạn nhận được email này vì bạn có quyền xem hội thoại trong ${workspaceName}.`,
        support: 'Cần hỗ trợ? Hãy gửi email tới',
        signOff: `Đội ngũ ${homeName}`,
    }),
};

/** The handoff email's wording in the chatbot's language, English otherwise. */
export const handoffEmailCopy = (
    language: string | undefined,
    homeName: string
): IHandoffEmailCopy =>
    (COPY[language as ENUM_MESSAGE_LANGUAGE] ?? COPY[ENUM_MESSAGE_LANGUAGE.EN])(
        homeName
    );
