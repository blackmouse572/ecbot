import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_ORDER_STATUS } from '../../enums/order.enum';
import {
    IOrderCustomerSummary,
    IOrderItemInput,
} from '../../interfaces/order.interface';
import { OrderItemEntity } from '../entities/order-item.entity';
import { OrderEntity } from '../entities/order.entity';
import { ProductGroupEntity } from '../entities/product-group.entity';

@Injectable()
export class OrderRepository extends DatabaseRepository<OrderEntity> {
    constructor(em: EntityManager) {
        super(em, OrderEntity, ['customer', 'items', 'items.productGroup']);
    }

    /** Swap all items of an order; the caller saves the order. */
    async replaceItems(
        order: OrderEntity,
        items: IOrderItemInput[]
    ): Promise<void> {
        order.items.removeAll();
        for (const item of items) {
            order.items.add(
                this.em.create(OrderItemEntity, {
                    order,
                    name: item.name,
                    productGroup: item.productGroupId
                        ? this.em.getReference(
                              ProductGroupEntity,
                              item.productGroupId
                          )
                        : undefined,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice ?? undefined,
                })
            );
        }
    }

    /** Count, sum and latest date of one customer's confirmed orders. */
    async summaryOfCustomer(
        workspaceId: string,
        customerId: string
    ): Promise<IOrderCustomerSummary> {
        const [row]: {
            orders: number;
            spent: string | null;
            last: Date | null;
        }[] = await this.em.execute(
            `select count(*)::int as orders,
                    sum(total)::text as spent,
                    max(ordered_at) as last
               from orders
              where workspace_id = ?
                and customer_id = ?
                and status = ?
                and deleted = false`,
            [workspaceId, customerId, ENUM_ORDER_STATUS.CONFIRMED]
        );
        return {
            confirmedOrders: row?.orders ?? 0,
            totalSpent: Number(row?.spent ?? 0),
            lastOrderedAt: row?.last ?? null,
        };
    }
}
