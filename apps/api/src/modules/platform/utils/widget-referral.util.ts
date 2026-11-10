import { TRACKED_LINK_CODE_PATTERN } from '@app/modules/customer/constants/tracked-link.constant';
import { PlatformReferral } from '../interfaces/platform-adapter.interface';

/** The `ecb_src` code a website visitor arrived with, when it is one we issue. */
export function widgetReferral(
    source: string | undefined
): PlatformReferral | undefined {
    return source && TRACKED_LINK_CODE_PATTERN.test(source)
        ? { code: source, source: 'link' }
        : undefined;
}
