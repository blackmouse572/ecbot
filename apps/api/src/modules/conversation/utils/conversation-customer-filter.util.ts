import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';
import { IConversationCustomerFilter } from '../interfaces/conversation.interface';

/**
 * The conversations list's `stage` and `tag` query fragments. `tag` is a
 * comma list of tag ids, passed raw by the equal pipe; anything else is 400.
 */
export function conversationCustomerFilterFromQuery(
    stage?: Record<string, any>,
    tag?: Record<string, any>
): IConversationCustomerFilter {
    const stages: ENUM_CUSTOMER_JOURNEY_STAGE[] | undefined = stage?.stage?.$in;
    const rawTag: unknown = tag?.tag;
    if (rawTag === undefined) return { stages };

    const tagIds =
        typeof rawTag === 'string'
            ? rawTag.split(',').map(id => id.trim())
            : [];
    if (!tagIds.length || !tagIds.every(id => isUUID(id))) {
        throw new BadRequestException({
            statusCode: 400,
            message: 'request.validation',
        });
    }
    return { stages, tagIds };
}
