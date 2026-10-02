import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface ICustomerTagSeed {
    name: string;
    emoji: string;
    description: string;
    triggersHandoff: boolean;
}

const CUSTOMER_TAG_DEFAULTS_EN: ICustomerTagSeed[] = [
    {
        name: 'Hot lead',
        emoji: '🔥',
        description: 'Customer has shown strong buying intent.',
        triggersHandoff: false,
    },
    {
        name: 'New lead',
        emoji: '✨',
        description: 'First-time customer, no history yet.',
        triggersHandoff: false,
    },
    {
        name: 'Returning customer',
        emoji: '🔁',
        description: 'Customer has interacted before.',
        triggersHandoff: false,
    },
    {
        name: 'VIP',
        emoji: '⭐',
        description: 'High-value customer, prioritize.',
        triggersHandoff: false,
    },
    {
        name: 'Positive',
        emoji: '😊',
        description: 'Customer expressed satisfaction.',
        triggersHandoff: false,
    },
    {
        name: 'Negative',
        emoji: '😟',
        description: 'Customer expressed dissatisfaction.',
        triggersHandoff: false,
    },
    {
        name: 'Complaint',
        emoji: '❗',
        description: 'Customer raised a complaint.',
        triggersHandoff: true,
    },
    {
        name: 'Angry',
        emoji: '🚨',
        description: 'Customer is upset or hostile.',
        triggersHandoff: true,
    },
];

const CUSTOMER_TAG_DEFAULTS_VI: ICustomerTagSeed[] = [
    {
        name: 'Khách tiềm năng cao',
        emoji: '🔥',
        description: 'Khách đã thể hiện ý định mua rõ ràng.',
        triggersHandoff: false,
    },
    {
        name: 'Khách mới',
        emoji: '✨',
        description: 'Khách liên hệ lần đầu, chưa có lịch sử.',
        triggersHandoff: false,
    },
    {
        name: 'Khách quay lại',
        emoji: '🔁',
        description: 'Khách đã từng trò chuyện trước đây.',
        triggersHandoff: false,
    },
    {
        name: 'VIP',
        emoji: '⭐',
        description: 'Khách có giá trị cao, cần ưu tiên.',
        triggersHandoff: false,
    },
    {
        name: 'Hài lòng',
        emoji: '😊',
        description: 'Khách bày tỏ sự hài lòng.',
        triggersHandoff: false,
    },
    {
        name: 'Không hài lòng',
        emoji: '😟',
        description: 'Khách bày tỏ sự không hài lòng.',
        triggersHandoff: false,
    },
    {
        name: 'Khiếu nại',
        emoji: '❗',
        description: 'Khách đưa ra khiếu nại.',
        triggersHandoff: true,
    },
    {
        name: 'Bực tức',
        emoji: '🚨',
        description: 'Khách đang bực bội hoặc gay gắt.',
        triggersHandoff: true,
    },
];

/**
 * The tag catalog a new workspace starts with, in the language its owner
 * created it in. The tags are workspace data the owner can rename later.
 */
export const CUSTOMER_TAG_DEFAULTS: Record<
    ENUM_MESSAGE_LANGUAGE,
    ICustomerTagSeed[]
> = {
    [ENUM_MESSAGE_LANGUAGE.EN]: CUSTOMER_TAG_DEFAULTS_EN,
    [ENUM_MESSAGE_LANGUAGE.VI]: CUSTOMER_TAG_DEFAULTS_VI,
};
