import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CUSTOMER_TAG_SYSTEM_KEY } from '@app/modules/customer/enums/customer-tag.enum';

/** Days `from` (inclusive) to `to` (exclusive), as YYYY-MM-DD in `timezone`. */
export interface IAnalyticsWindow {
    workspaceId: string;
    from: string;
    to: string;
    timezone: string;
}

export interface IAnalyticsFunnelRow {
    platform: ENUM_ACCOUNT_TYPE;
    newCustomers: number;
    engaged: number;
    hotLeads: number;
    orders: number;
}

export interface IAnalyticsConversionDayRow {
    day: string;
    newCustomers: number;
    orders: number;
}

export interface IAnalyticsSentimentDayRow {
    day: string;
    positive: number;
    negative: number;
    complaint: number;
}

export interface IAnalyticsSentimentChannelRow {
    platform: ENUM_ACCOUNT_TYPE;
    conversations: number;
    positive: number;
    negative: number;
}

export interface IAnalyticsUnhappyRow {
    customerId: string;
    conversationId: string | null;
    name: string | null;
    platform: ENUM_ACCOUNT_TYPE | null;
    tagName: string;
    emoji: string | null;
    at: Date;
}

export interface IAnalyticsBotDayRow {
    day: string;
    conversations: number;
    botResolved: number;
    handedOver: number;
}

export interface IAnalyticsBotChatbotRow {
    id: string;
    name: string;
    conversations: number;
    botResolved: number;
    handedOver: number;
    firstReplySeconds: number | null;
    toolCalls: number;
    toolErrors: number;
}

export interface IAnalyticsHandoffReasonRow {
    reason: string | null;
    tagId: string | null;
    tagName: string | null;
    emoji: string | null;
    systemKey: ENUM_CUSTOMER_TAG_SYSTEM_KEY | null;
    count: number;
}

export interface IAnalyticsTagRow {
    id: string;
    name: string;
    emoji: string | null;
    count: number;
}

export interface IAnalyticsCustomerDayRow {
    day: string;
    newCustomers: number;
    returning: number;
}

export interface IAnalyticsChannelCountRow {
    platform: ENUM_ACCOUNT_TYPE;
    count: number;
}
