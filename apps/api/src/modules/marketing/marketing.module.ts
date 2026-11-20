import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MarketingAudienceRepository } from './repository/repositories/marketing-audience.repository';
import { MarketingOverviewRepository } from './repository/repositories/marketing-overview.repository';
import { MarketingAudienceService } from './services/marketing-audience.service';
import { MarketingOverviewService } from './services/marketing-overview.service';

/** Tiếp thị v2 (#502 onward): Tổng quan and audiences now, sending later. */
@Module({
    imports: [MikroOrmModule.forFeature([CustomerEntity])],
    providers: [
        MarketingOverviewRepository,
        MarketingOverviewService,
        MarketingAudienceRepository,
        MarketingAudienceService,
    ],
    exports: [MarketingOverviewService, MarketingAudienceService],
})
export class MarketingModule {}
