import { CustomerModule } from '@app/modules/customer/customer.module';
import { CustomerRepositoryModule } from '@app/modules/customer/repository/customer.repository.module';
import { Module } from '@nestjs/common';
import { OrderRepositoryModule } from './repository/order.repository.module';
import { OrderImportService } from './services/order-import.service';
import { OrderService } from './services/order.service';
import { ProductGroupService } from './services/product-group.service';

@Module({
    imports: [OrderRepositoryModule, CustomerRepositoryModule, CustomerModule],
    providers: [OrderService, OrderImportService, ProductGroupService],
    exports: [OrderService, OrderImportService, ProductGroupService],
})
export class OrderModule {}
