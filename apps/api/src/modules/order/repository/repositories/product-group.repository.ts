import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ORDER_LEARNED_CYCLE_MIN_PAIRS } from '../../constants/order.constant';
import { ENUM_ORDER_STATUS } from '../../enums/order.enum';
import { OrderItemEntity } from '../entities/order-item.entity';
import { ProductGroupEntity } from '../entities/product-group.entity';

@Injectable()
export class ProductGroupRepository extends DatabaseRepository<ProductGroupEntity> {
    constructor(em: EntityManager) {
        super(em, ProductGroupEntity);
    }

    /** Recompute and store the learned cycle of each group. */
    async refreshLearnedRepurchaseDays(ids: string[]): Promise<void> {
        for (const id of new Set(ids)) {
            const days = await this.computeLearnedRepurchaseDays(id);
            await this.updateRaw({ id }, { learnedRepurchaseDays: days });
        }
    }

    /**
     * Recompute the groups found in these orders, after the orders moved to
     * another customer (merge, unmerge): the cycle is per customer.
     */
    async refreshLearnedRepurchaseDaysOfOrders(
        orderIds: string[]
    ): Promise<void> {
        if (!orderIds.length) return;
        const items = await this.em.find(
            OrderItemEntity,
            { order: { $in: orderIds }, productGroup: { $ne: null } },
            { fields: ['productGroup'] }
        );
        await this.refreshLearnedRepurchaseDays(
            items.flatMap(item =>
                item.productGroup ? [item.productGroup.id] : []
            )
        );
    }

    /**
     * Median days between two consecutive confirmed orders of the same
     * customer that contain the group, or null below the minimum number of
     * pairs. An order with two items of the group counts once, and a second
     * order within a day of the last is not a repurchase (gaps under a day
     * are left out, so the median is never 0).
     */
    async computeLearnedRepurchaseDays(
        productGroupId: string
    ): Promise<number | null> {
        const rows: { pairs: number; median: number | null }[] =
            await this.em.execute(
                `with o as (
                    select distinct ord.id, ord.customer_id, ord.ordered_at
                      from orders ord
                      join order_items i on i.order_id = ord.id
                     where i.product_group_id = ?
                       and ord.status = ?
                       and ord.deleted = false
                       and i.deleted = false
                 ), gaps as (
                    select extract(epoch from ordered_at - lag(ordered_at)
                               over (partition by customer_id order by ordered_at)) / 86400 as days
                      from o
                 )
                 select count(days)::int as pairs,
                        percentile_cont(0.5) within group (order by days) as median
                   from gaps
                  where days >= 1`,
                [productGroupId, ENUM_ORDER_STATUS.CONFIRMED]
            );
        const row = rows[0];
        if (!row || row.pairs < ORDER_LEARNED_CYCLE_MIN_PAIRS) return null;
        return row.median === null ? null : Math.round(Number(row.median));
    }
}
