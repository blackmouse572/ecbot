import { ENUM_CUSTOMER_TAG_SYSTEM_KEY } from '../enums/customer-tag.enum';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export interface ICustomerTagSeed {
    systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY;
    name: string;
    emoji: string;
    description: string;
    triggersHandoff: boolean;
    notifiesTeam?: boolean;
}

const CUSTOMER_TAG_DEFAULTS_EN: ICustomerTagSeed[] = [
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.HOT_LEAD,
        name: 'Hot lead',
        emoji: '🔥',
        description: 'Customer has shown strong buying intent.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_LEAD,
        name: 'New lead',
        emoji: '✨',
        description: 'First-time customer, no history yet.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.RETURNING_CUSTOMER,
        name: 'Returning customer',
        emoji: '🔁',
        description: 'Customer has interacted before.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.VIP,
        name: 'VIP',
        emoji: '⭐',
        description: 'High-value customer, prioritize.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.POSITIVE,
        name: 'Positive',
        emoji: '😊',
        description: 'Customer expressed satisfaction.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEGATIVE,
        name: 'Negative',
        emoji: '😟',
        description: 'Customer expressed dissatisfaction.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.COMPLAINT,
        name: 'Complaint',
        emoji: '❗',
        description: 'Customer raised a complaint.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.ANGRY,
        name: 'Angry',
        emoji: '🚨',
        description: 'Customer is upset or hostile.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_ORDER,
        name: 'New order',
        emoji: '🧾',
        description: 'Customer confirmed an order for staff to finish.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEEDS_STAFF,
        name: 'Needs staff',
        emoji: '🙋',
        description: 'Customer asked to talk to a person.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_BOOKING,
        name: 'New booking',
        emoji: '🗓️',
        description:
            'Customer confirmed a booking or callback for staff to confirm.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.ORDER_PLACED,
        name: 'Order placed',
        emoji: '🛒',
        description: 'The order tool placed an order for the customer.',
        triggersHandoff: false,
        notifiesTeam: true,
    },
];

const CUSTOMER_TAG_DEFAULTS_VI: ICustomerTagSeed[] = [
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.HOT_LEAD,
        name: 'Khách tiềm năng cao',
        emoji: '🔥',
        description: 'Khách đã thể hiện ý định mua rõ ràng.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_LEAD,
        name: 'Khách mới',
        emoji: '✨',
        description: 'Khách liên hệ lần đầu, chưa có lịch sử.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.RETURNING_CUSTOMER,
        name: 'Khách quay lại',
        emoji: '🔁',
        description: 'Khách đã từng trò chuyện trước đây.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.VIP,
        name: 'VIP',
        emoji: '⭐',
        description: 'Khách có giá trị cao, cần ưu tiên.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.POSITIVE,
        name: 'Hài lòng',
        emoji: '😊',
        description: 'Khách bày tỏ sự hài lòng.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEGATIVE,
        name: 'Không hài lòng',
        emoji: '😟',
        description: 'Khách bày tỏ sự không hài lòng.',
        triggersHandoff: false,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.COMPLAINT,
        name: 'Khiếu nại',
        emoji: '❗',
        description: 'Khách đưa ra khiếu nại.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.ANGRY,
        name: 'Bực tức',
        emoji: '🚨',
        description: 'Khách đang bực bội hoặc gay gắt.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_ORDER,
        name: 'Đơn hàng mới',
        emoji: '🧾',
        description: 'Khách đã chốt đơn, cần nhân viên xác nhận.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEEDS_STAFF,
        name: 'Cần nhân viên',
        emoji: '🙋',
        description: 'Khách muốn trao đổi với nhân viên.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_BOOKING,
        name: 'Lịch hẹn mới',
        emoji: '🗓️',
        description:
            'Khách đã chốt lịch hẹn hoặc nhờ gọi lại, cần nhân viên xác nhận.',
        triggersHandoff: true,
    },
    {
        systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY.ORDER_PLACED,
        name: 'Đã đặt đơn',
        emoji: '🛒',
        description: 'Đơn hàng đã được đặt qua công cụ đặt hàng.',
        triggersHandoff: false,
        notifiesTeam: true,
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
