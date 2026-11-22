import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';
import { IMarketingSendRules } from './marketing-send.interface';
import {
    ENUM_MARKETING_AUDIENCE_EXCLUSION,
    ENUM_MARKETING_AUDIENCE_FIELD,
    ENUM_MARKETING_AUDIENCE_MATCH,
    ENUM_MARKETING_AUDIENCE_OPERATOR,
} from '../enums/marketing-audience.enum';

export interface IMarketingAudienceCondition {
    field: ENUM_MARKETING_AUDIENCE_FIELD;
    operator: ENUM_MARKETING_AUDIENCE_OPERATOR;
    values?: string[];
    number?: number;
}

/** A "Việc nên làm" preset, or conditions joined by Tất cả / Bất kỳ. */
export type IMarketingAudience =
    | { preset: ENUM_MARKETING_TODO }
    | {
          match: ENUM_MARKETING_AUDIENCE_MATCH;
          conditions: IMarketingAudienceCondition[];
      };

/** Whose customers, as of when, and under which send rules. */
export interface IMarketingAudienceWindow {
    workspaceId: string;
    now: Date;
    /** The shop's calendar day of `now`, "yyyy-MM-dd". */
    today: string;
    rules: IMarketingSendRules;
}

/** A piece of SQL and the values bound to its `?` placeholders, in order. */
export interface IMarketingSql {
    sql: string;
    params: unknown[];
}

export interface IMarketingAudiencePreviewRow {
    /** Customers who match, by the reason they are left out (null: reached). */
    reasons: {
        reason: ENUM_MARKETING_AUDIENCE_EXCLUSION | null;
        count: number;
    }[];
    channels: { platform: ENUM_ACCOUNT_TYPE; count: number }[];
}
