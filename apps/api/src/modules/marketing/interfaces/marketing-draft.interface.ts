import { MarketingDraftLanguage } from '../constants/marketing-draft.constant';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';

export interface IMarketingDraftInput {
    /** The stage the send goes to; left out for a send by conditions. */
    preset?: ENUM_MARKETING_TODO;
    conditions?: unknown[];
    /** The shop's offer in its own words, e.g. "Giảm 10% đến 20/11". */
    offer?: string;
    /** The last draft, so "Viết kiểu khác" gets a different one. */
    previous?: string;
    language?: MarketingDraftLanguage;
}
