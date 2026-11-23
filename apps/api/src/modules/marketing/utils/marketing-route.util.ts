import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { customerMarketingFreeWindows } from '@app/modules/customer/utils/customer-marketing-free-window.util';
import { ENUM_MARKETING_SKIP_REASON } from '../enums/marketing-send.enum';
import { IMarketingRoute } from '../interfaces/marketing-send.interface';

/**
 * The free route to one customer at `sendAt`: the most recently used channel
 * whose free window is still open then, so the shop never pays and a
 * customer on several channels gets one message. `windowHours` is the
 * channel's `freeMessageWindowHours` (null: no limit, undefined: no offers).
 */
export function marketingRoute(
    customerId: string,
    lastInbound: {
        channel: ENUM_ACCOUNT_TYPE;
        conversationId: string;
        lastInboundAt: Date;
    }[],
    windowHours: (channel: ENUM_ACCOUNT_TYPE) => number | null | undefined,
    sendAt: Date
): IMarketingRoute {
    const windows = customerMarketingFreeWindows(lastInbound, windowHours);
    const open = windows.find(
        w => w.openUntil === null || w.openUntil > sendAt
    );
    if (open) {
        return {
            customerId,
            channel: open.channel,
            conversationId: open.conversationId,
            openUntil: open.openUntil,
        };
    }
    if (!windows.length) {
        return { customerId, skip: ENUM_MARKETING_SKIP_REASON.NO_CHANNEL };
    }
    return {
        customerId,
        skip: ENUM_MARKETING_SKIP_REASON.WINDOW_CLOSED,
        channel: windows[0].channel,
    };
}
