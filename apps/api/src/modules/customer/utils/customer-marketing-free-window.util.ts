import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ICustomerMarketingFreeWindow } from '../interfaces/customer-marketing.interface';

const HOUR_MS = 3_600_000;

/**
 * The free-message window on each channel the customer last wrote on, most
 * recent first. `windowHours` is the channel's `freeMessageWindowHours`:
 * null is no limit, undefined is no free route for offers (left out).
 */
export function customerMarketingFreeWindows(
    lastInbound: Omit<ICustomerMarketingFreeWindow, 'openUntil'>[],
    windowHours: (channel: ENUM_ACCOUNT_TYPE) => number | null | undefined
): ICustomerMarketingFreeWindow[] {
    return lastInbound
        .flatMap(row => {
            const hours = windowHours(row.channel);
            if (hours === undefined) return [];
            const openUntil =
                hours === null
                    ? null
                    : new Date(row.lastInboundAt.getTime() + hours * HOUR_MS);
            return [{ ...row, openUntil }];
        })
        .sort((a, b) => b.lastInboundAt.getTime() - a.lastInboundAt.getTime());
}
