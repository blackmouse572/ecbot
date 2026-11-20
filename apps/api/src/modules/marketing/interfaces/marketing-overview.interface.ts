import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';

/** The instants every Tổng quan number is measured against. */
export interface IMarketingOverviewWindow {
    workspaceId: string;
    now: Date;
    /** Length of the chosen range, in days. */
    days: number;
}

export interface IMarketingOverviewStageRow {
    stage: ENUM_CUSTOMER_JOURNEY_STAGE;
    current: number;
    previous: number;
}

export interface IMarketingOverviewMoveRow {
    from: ENUM_CUSTOMER_JOURNEY_STAGE;
    to: ENUM_CUSTOMER_JOURNEY_STAGE;
    count: number;
}

/** Customers now at a stage, by the channel they first wrote from. */
export interface IMarketingOverviewFunnelRow {
    platform: ENUM_ACCOUNT_TYPE;
    stage: ENUM_CUSTOMER_JOURNEY_STAGE;
    count: number;
}

/** Customers a row is about, and how many of them must not get offers. */
export interface IMarketingOverviewTodoCount {
    count: number;
    excluded: number;
}

/** Point-in-time counts over the workspace's live customers. */
export interface IMarketingOverviewNowRow {
    total: number;
    dormant: number;
    paused: number;
    todos: Record<ENUM_MARKETING_TODO, IMarketingOverviewTodoCount>;
    /** Customers in any row, each counted once. */
    todoTotal: IMarketingOverviewTodoCount;
}

export interface IMarketingOverviewOptOutRow {
    current: number;
    previous: number;
}
