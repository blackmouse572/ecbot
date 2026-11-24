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

export const MARKETING_DRAFT_RULES = [
    'One to three short sentences, under 300 characters.',
    'Warm and natural, as the shop owner would write it.',
    'Greet the customer with {name}.',
    'Keep {name} and {product} exactly as written: each customer gets their own name and product group.',
    'Use the offer exactly as given. Never invent a discount, price, gift or deadline. With no offer, invite them to reply instead.',
    'No emoji, hashtags, dashes or quotes.',
    'Reply with the message only.',
];
