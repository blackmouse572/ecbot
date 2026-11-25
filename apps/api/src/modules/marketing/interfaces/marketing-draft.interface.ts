import { MarketingDraftLanguage } from '../constants/marketing-draft.constant';
import {
    ENUM_MARKETING_DRAFT_REWRITE,
    ENUM_MARKETING_DRAFT_TONE,
} from '../enums/marketing-draft.enum';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';

export interface IMarketingDraftInput {
    /** The stage the send goes to; left out for a send by conditions. */
    preset?: ENUM_MARKETING_TODO;
    /** The shop's offer in its own words, e.g. "Giảm 10% đến 20/11". */
    offer?: string;
    /** The current text, which `rewrite` works on. */
    previous?: string;
    /** Left out with a `previous`, it means DIFFERENT. */
    rewrite?: ENUM_MARKETING_DRAFT_REWRITE;
    tone?: ENUM_MARKETING_DRAFT_TONE;
    language?: MarketingDraftLanguage;
}
