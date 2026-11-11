import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';

export const TRACKED_LINK_PARAM = 'trackedLink';

export const TrackedLinkDocParams = [
    {
        name: TRACKED_LINK_PARAM,
        description: 'The ID of the tracked link',
        required: true,
        type: 'string',
    },
];

/** Telegram allows 64 characters in a start payload; leave room for "-2". */
export const TRACKED_LINK_CODE_MAX_LENGTH = 40;

/** A QR or KOL code is the source's code plus its own; capped so "-2" still fits in 64. */
export const TRACKED_LINK_CHILD_CODE_MAX_LENGTH = 60;

/** Every code we issue: a-z, 0-9 and "-", at most 64 characters. */
export const TRACKED_LINK_CODE_PATTERN = /^[a-z0-9-]{1,64}$/;

/** The query parameter the website widget reads the code from. */
export const TRACKED_LINK_WEBSITE_PARAM = 'ecb_src';

/** WhatsApp has no ref field, so the code rides in the prefilled message. */
export const TRACKED_LINK_WHATSAPP_TEXT = (code: string): string =>
    `Xin chào shop (mã ${code})`;

/** Finds the code {@link TRACKED_LINK_WHATSAPP_TEXT} put in a message. */
export const TRACKED_LINK_WHATSAPP_CODE = /\(mã ([a-z0-9-]{1,64})\)/;

/** Channels whose links can carry a code today. Zalo OA waits on research. */
export const TRACKED_LINK_ACCOUNT_TYPES: ENUM_ACCOUNT_TYPE[] = [
    ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
    ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
    ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
    ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
    ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
];

export const TRACKED_LINK_AVAILABLE_SEARCH = ['name', 'code'];
