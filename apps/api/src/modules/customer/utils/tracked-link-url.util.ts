import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    TRACKED_LINK_WEBSITE_PARAM,
    TRACKED_LINK_WHATSAPP_TEXT,
} from '../constants/tracked-link.constant';
import { ITrackedLinkAccount } from '../interfaces/tracked-link.interface';

/** The last path segment of a profile link, e.g. the bot in t.me/lumi_bot. */
function handleOf(link?: string): string | null {
    if (!link) return null;

    try {
        const segment = new URL(link).pathname.split('/').filter(Boolean).pop();

        return segment ? segment.replace(/^@/, '') : null;
    } catch {
        return null;
    }
}

/**
 * The link a customer opens to start a chat that carries `code`, built on
 * the channel's own deep link. Null when the channel cannot carry a code
 * (or, for the website, when no page was given).
 */
export function trackedLinkUrl(
    account: ITrackedLinkAccount,
    code: string,
    targetUrl?: string | null
): string | null {
    const ref = encodeURIComponent(code);

    switch (account.type) {
        case ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE:
            return `https://m.me/${account.externalId}?ref=${ref}`;
        case ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE:
        case ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT: {
            const username = handleOf(account.link);

            return username ? `https://ig.me/m/${username}?ref=${ref}` : null;
        }
        case ENUM_ACCOUNT_TYPE.TELEGRAM_BOT: {
            const bot = handleOf(account.link);

            return bot ? `https://t.me/${bot}?start=${ref}` : null;
        }
        case ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS: {
            const phone = handleOf(account.link);
            if (!phone) return null;

            const text = encodeURIComponent(TRACKED_LINK_WHATSAPP_TEXT(code));

            return `https://wa.me/${phone}?text=${text}`;
        }
        case ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET: {
            if (!targetUrl) return null;

            try {
                const url = new URL(targetUrl);
                url.searchParams.set(TRACKED_LINK_WEBSITE_PARAM, code);

                return url.toString();
            } catch {
                return null;
            }
        }
        default:
            return null;
    }
}
