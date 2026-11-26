import {
    ENUM_MARKETING_AUDIENCE_FIELD as F,
    ENUM_MARKETING_AUDIENCE_OPERATOR as O,
} from '../enums/marketing-audience.enum';

export const MARKETING_AUDIENCE_MAX_CONDITIONS = 20;
export const MARKETING_AUDIENCE_MAX_VALUES = 50;
export const MARKETING_AUDIENCE_MAX_DAYS = 3650;
export const MARKETING_AUDIENCE_MAX_EXCLUDED = 1000;
export const MARKETING_AUDIENCE_MAX_SEARCH_LENGTH = 100;

/** The operators each field takes, and what the operator reads. */
export const MARKETING_AUDIENCE_OPERATORS: Record<F, O[]> = {
    [F.STAGE]: [O.IN, O.NOT_IN],
    [F.PRODUCT_GROUP_ASKED]: [O.IN],
    [F.PRODUCT_GROUP_BOUGHT]: [O.IN],
    [F.LAST_MESSAGE]: [O.WITHIN_DAYS, O.OLDER_THAN_DAYS],
    [F.ORDERED_AFTER_PRICE]: [O.YES, O.NO],
    [F.ORDER_COUNT]: [O.AT_LEAST, O.AT_MOST],
    [F.TOTAL_SPEND]: [O.AT_LEAST, O.AT_MOST],
    [F.LABEL]: [O.IN, O.NOT_IN],
    [F.CHANNEL]: [O.IN, O.NOT_IN],
};

/** Operators that read `values`; the day and amount ones read `number`. */
export const MARKETING_AUDIENCE_LIST_OPERATORS: O[] = [O.IN, O.NOT_IN];
export const MARKETING_AUDIENCE_NUMBER_OPERATORS: O[] = [
    O.WITHIN_DAYS,
    O.OLDER_THAN_DAYS,
    O.AT_LEAST,
    O.AT_MOST,
];

/** Saved audience list: search by name, newest first. */
export const MARKETING_AUDIENCE_AVAILABLE_SEARCH = ['name'];
export const MARKETING_AUDIENCE_AVAILABLE_ORDER_BY = ['name', 'createdAt'];
