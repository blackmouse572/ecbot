import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ORDER_LEARNED_CYCLE_MIN_PAIRS } from '../../constants/order.constant';
import { ENUM_ORDER_STATUS } from '../../enums/order.enum';
import { ProductGroupEntity } from '../entities/product-group.entity';

@Injectable()
export class ProductGroupRepository extends DatabaseRepository<ProductGroupEntity> {
    constructor(em: EntityManager) {
        super(em, ProductGroupEntity);
    }

    /**
     * Median days between two consecutive confirmed orders of the same
     * customer that contain the group, or null below the minimum number of
     * pairs. An order with two items of the group counts once.
     */
    async computeLearnedRepurchaseDays(
        productGroupId: string
    ): Promise<number | null> {
        const rows: { pairs: number; median: number | null }[] = await this.em
            .getConnection()
            .execute(
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
                  where days is not null`,
                [productGroupId, ENUM_ORDER_STATUS.CONFIRMED]
            );
        const row = rows[0];
        if (!row || row.pairs < ORDER_LEARNED_CYCLE_MIN_PAIRS) return null;
        return row.median === null ? null : Math.round(Number(row.median));
    }
}
