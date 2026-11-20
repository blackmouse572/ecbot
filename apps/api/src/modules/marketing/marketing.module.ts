import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MarketingOverviewRepository } from './repository/repositories/marketing-overview.repository';
import { MarketingOverviewService } from './services/marketing-overview.service';

/** Tiếp thị v2 (#502 onward): Tổng quan now, sending later. */
@Module({
    imports: [MikroOrmModule.forFeature([CustomerEntity])],
    providers: [MarketingOverviewRepository, MarketingOverviewService],
    exports: [MarketingOverviewService],
})
export class MarketingModule {}
