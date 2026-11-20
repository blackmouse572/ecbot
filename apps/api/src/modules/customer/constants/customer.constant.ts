import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';

/**
 * Channels whose senders arrive with no name, phone or profile. A sender here
 * becomes a Customer only once they share something (the agent saves their
 * phone, records an order, ...) or arrive through a tracked link, so a visitor
 * who just says hi does not fill the Customers list or the plan's limit.
 */
export const ANONYMOUS_CHANNELS: ReadonlySet<ENUM_ACCOUNT_TYPE> = new Set([
    ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
    ENUM_ACCOUNT_TYPE.API_CHANNEL,
]);
