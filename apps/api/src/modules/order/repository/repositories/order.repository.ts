import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { IOrderItemInput } from '../../interfaces/order.interface';
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
}
