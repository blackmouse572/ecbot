import { CustomerRepositoryModule } from '@app/modules/customer/repository/customer.repository.module';
import { Module } from '@nestjs/common';
import { OrderRepositoryModule } from './repository/order.repository.module';
import { OrderService } from './services/order.service';
import { ProductGroupService } from './services/product-group.service';

@Module({
    imports: [OrderRepositoryModule, CustomerRepositoryModule],
    providers: [OrderService, ProductGroupService],
    exports: [OrderService, ProductGroupService],
})
export class OrderModule {}
