import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';

export const CONVERSATION_DEFAULT_AVAILABLE_SEARCH = [
    'account.name',
    'account.slug',
    'senderId',
];

/**
 * The inbox sorts by newest message: `lastMessageAt` is bumped on every new
 * message, customer, bot or staff. createdAt stays for API clients.
 */
export const CONVERSATION_DEFAULT_ORDER_BY = 'lastMessageAt';
export const CONVERSATION_DEFAULT_AVAILABLE_ORDER_BY = [
    'lastMessageAt',
    'createdAt',
];

export const CONVERSATION_DEFAULT_STATUS = Object.values(
    ENUM_CONVERSATION_STATUS
);

export const CONVERSATION_DEFAULT_ACCOUNT_TYPE =
    Object.values(ENUM_ACCOUNT_TYPE);
