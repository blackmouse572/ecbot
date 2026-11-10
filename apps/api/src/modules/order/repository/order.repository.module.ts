import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { ProductGroupEntity } from './entities/product-group.entity';
import { OrderRepository } from './repositories/order.repository';
import { ProductGroupRepository } from './repositories/product-group.repository';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            ProductGroupEntity,
            OrderEntity,
            OrderItemEntity,
        ]),
    ],
    providers: [OrderRepository, ProductGroupRepository],
    exports: [OrderRepository, ProductGroupRepository],
})
export class OrderRepositoryModule {}
