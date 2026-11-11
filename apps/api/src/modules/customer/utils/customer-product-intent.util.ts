import { ProductGroupEntity } from '@app/modules/order/repository/entities/product-group.entity';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '../enums/customer-marketing.enum';
import { MarketingEventEntity } from '../repository/entities/marketing-event.entity';

export interface ICustomerProductIntent {
    /** Null for interest in the shop in general. */
    productGroup: ProductGroupEntity | null;
    stage: ENUM_CUSTOMER_JOURNEY_STAGE;
    at: Date;
}

export interface IConfirmedOrderGroups {
    orderedAt: Date;
    /** Null for an item with no product group. */
    productGroupIds: (string | null)[];
}

/**
 * The intents that still count: the latest per product group and stage,
 * unless a confirmed order with that group came after it. Interest in the
 * shop in general ends with any later order. `events` are INTENT events,
 * newest first.
 */
export function activeProductIntents(
    events: MarketingEventEntity[],
    orders: IConfirmedOrderGroups[]
): ICustomerProductIntent[] {
    const latest = new Map<string, MarketingEventEntity>();
    for (const event of events) {
        const key = `${event.productGroup?.id ?? ''}|${event.newValue}`;
        if (!latest.has(key)) latest.set(key, event);
    }
    return [...latest.values()].flatMap(event => {
        const groupId = event.productGroup?.id ?? null;
        const orderedSince = orders.some(
            order =>
                order.orderedAt > event.createdAt &&
                (groupId === null || order.productGroupIds.includes(groupId))
        );
        if (orderedSince) return [];
        return [
            {
                productGroup: event.productGroup ?? null,
                stage: event.newValue as ENUM_CUSTOMER_JOURNEY_STAGE,
                at: event.createdAt,
            },
        ];
    });
}
