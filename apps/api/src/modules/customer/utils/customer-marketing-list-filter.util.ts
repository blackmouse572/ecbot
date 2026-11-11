import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../enums/customer-marketing.enum';
import { ICustomerMarketingListFilter } from '../interfaces/customer-marketing.interface';

/**
 * The customers list's `stage`, `permission`, `dormant` and `source` query
 * fragments as a label filter. Asking for both dormant values, or none, does
 * not filter. `source` must be one source id: the equal pipe passes it raw.
 */
export function customerMarketingListFilterFromQuery(
    stage?: Record<string, any>,
    permission?: Record<string, any>,
    dormant?: Record<string, any>,
    source?: Record<string, any>
): ICustomerMarketingListFilter {
    const dormantValues: boolean[] | undefined = dormant?.dormant?.$in;
    const sourceId: unknown = source?.source;
    const isSourceId = typeof sourceId === 'string' && isUUID(sourceId);

    if (sourceId !== undefined && !isSourceId) {
        throw new BadRequestException({
            statusCode: 400,
            message: 'request.validation',
        });
    }

    return {
        stages: stage?.stage?.$in as ENUM_CUSTOMER_JOURNEY_STAGE[] | undefined,
        permissions: permission?.permission?.$in as
            ENUM_CUSTOMER_MARKETING_PERMISSION[] | undefined,
        dormant: dormantValues?.length === 1 ? dormantValues[0] : undefined,
        sourceId: isSourceId ? sourceId : undefined,
    };
}
