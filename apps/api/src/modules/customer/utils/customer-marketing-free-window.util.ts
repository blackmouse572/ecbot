import { CUSTOMER_MARKETING_FREE_WINDOW_HOURS } from '../constants/customer-marketing.constant';
import { ICustomerMarketingFreeWindow } from '../interfaces/customer-marketing.interface';

const HOUR_MS = 3_600_000;

/**
 * The free-message window on each channel the customer last wrote on, most
 * recent first. Channels without a free route for offers are left out.
 */
export function customerMarketingFreeWindows(
    lastInbound: Omit<ICustomerMarketingFreeWindow, 'openUntil'>[]
): ICustomerMarketingFreeWindow[] {
    return lastInbound
        .flatMap(row => {
            if (!(row.channel in CUSTOMER_MARKETING_FREE_WINDOW_HOURS))
                return [];
            const hours = CUSTOMER_MARKETING_FREE_WINDOW_HOURS[row.channel];
            const openUntil =
                hours == null
                    ? null
                    : new Date(row.lastInboundAt.getTime() + hours * HOUR_MS);
            return [{ ...row, openUntil }];
        })
        .sort((a, b) => b.lastInboundAt.getTime() - a.lastInboundAt.getTime());
}
