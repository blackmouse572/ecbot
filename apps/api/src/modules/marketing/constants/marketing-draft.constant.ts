import {
    ENUM_MARKETING_DRAFT_REWRITE,
    ENUM_MARKETING_DRAFT_TONE,
} from '../enums/marketing-draft.enum';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';

export const MARKETING_DRAFT_MAX_OFFER_LENGTH = 500;

export const MARKETING_DRAFT_LANGUAGES = ['vi', 'en'] as const;
export type MarketingDraftLanguage = (typeof MARKETING_DRAFT_LANGUAGES)[number];

export const MARKETING_DRAFT_LANGUAGE_NAME: Record<
    MarketingDraftLanguage,
    string
> = {
    vi: 'Vietnamese',
    en: 'English',
};

/** Who each "Việc nên làm" stage is, and the angle its message takes. */
export const MARKETING_DRAFT_STAGE: Record<ENUM_MARKETING_TODO, string> = {
    [ENUM_MARKETING_TODO.NEW]:
        'customers who first wrote to the shop this week. Welcome them and invite them to ask about {product}.',
    [ENUM_MARKETING_TODO.INTERESTED]:
        'customers who looked at {product} but have not asked the price yet. Remind them of it and invite a question.',
    [ENUM_MARKETING_TODO.ASKED_PRICE]:
        'customers who asked the price of {product} this week and did not buy. Help them decide.',
    [ENUM_MARKETING_TODO.CROSS_SELL]:
        'customers who bought {product} once, 15 to 30 days ago. Thank them and suggest something that goes with it.',
    [ENUM_MARKETING_TODO.REPURCHASE]:
        'customers whose {product} is probably running out. Invite them to order again.',
    [ENUM_MARKETING_TODO.WIN_BACK]:
        'customers who bought before and have not written for one to three months. Tell them the shop misses them.',
};

export const MARKETING_DRAFT_CUSTOM_AUDIENCE =
    'customers the shop picked with its own conditions. Mention {product} where it fits.';

/** A new draft's length; a rewrite says its own. */
export const MARKETING_DRAFT_LENGTH =
    'One to three short sentences, under 300 characters.';

export const MARKETING_DRAFT_TONE: Record<ENUM_MARKETING_DRAFT_TONE, string> = {
    [ENUM_MARKETING_DRAFT_TONE.FRIENDLY]:
        'Warm and natural, as the shop owner would write it.',
    [ENUM_MARKETING_DRAFT_TONE.POLITE]:
        'Polite and respectful, a little formal, as a careful shop would write to a valued customer.',
    [ENUM_MARKETING_DRAFT_TONE.PLAYFUL]:
        'Light, cheerful and playful, still respectful.',
};

/** What to do with the current text; `{current}` is replaced by it. */
export const MARKETING_DRAFT_REWRITE: Record<
    ENUM_MARKETING_DRAFT_REWRITE,
    string
> = {
    [ENUM_MARKETING_DRAFT_REWRITE.DIFFERENT]:
        'Write a different version of the current text, about as long: {current}',
    [ENUM_MARKETING_DRAFT_REWRITE.LONGER]:
        'Make the current text longer, three to five sentences and under 600 characters, with one more concrete reason to reply. Keep its meaning and offer: {current}',
    [ENUM_MARKETING_DRAFT_REWRITE.SHORTER]:
        'Make the current text shorter, one or two sentences and under 150 characters. Keep its offer: {current}',
};

export const MARKETING_DRAFT_RULES = [
    'Greet the customer with {name}.',
    'Keep {name} and {product} exactly as written: each customer gets their own name and product group.',
    'Use the offer exactly as given. Never invent a discount, price, gift or deadline. With no offer, invite them to reply instead.',
    'No emoji, hashtags, dashes or quotes.',
    'Reply with the message only.',
];
