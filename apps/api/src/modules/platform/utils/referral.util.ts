import { TRACKED_LINK_CODE_PATTERN } from '@app/modules/customer/constants/tracked-link.constant';
import { PlatformReferral } from '../interfaces/platform-adapter.interface';

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
