import {
    TRACKED_LINK_CODE_PATTERN,
    TRACKED_LINK_WHATSAPP_TEXT,
} from '@app/modules/customer/constants/tracked-link.constant';
import {
    PlatformReferral,
    PlatformWebhookEvent,
} from '../interfaces/platform-adapter.interface';

/** A code from any channel in the shape we store it (lowercase), or undefined
 *  when it cannot be one of ours. */
export function trackedLinkCode(raw: string | undefined): string | undefined {
    const code = raw?.trim().toLowerCase();

    return code && TRACKED_LINK_CODE_PATTERN.test(code) ? code : undefined;
}

/** The `ecb_src` code a website visitor arrived with, when it is one we issue. */
export function widgetReferral(
    source: string | undefined
): PlatformReferral | undefined {
    const code = trackedLinkCode(source);

    return code ? { code, source: 'link' } : undefined;
}

/** True when the event only carried the link: a reopened chat, Get Started,
 *  Telegram's /start, or WhatsApp's prefilled text sent unedited. The source's
 *  greeting is then the whole reply. */
export function opensChatOnly(event: PlatformWebhookEvent): boolean {
    const code = event.referral?.code;
    if (!code) return false;
    if (event.kind === 'referral' || event.action) return true;
    const text = event.text?.trim();

    return text === '/start' || text === TRACKED_LINK_WHATSAPP_TEXT(code);
}
