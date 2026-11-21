import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MarketingSavedAudienceEntity } from './repository/entities/marketing-saved-audience.entity';
import { MarketingAudienceRepository } from './repository/repositories/marketing-audience.repository';
import { MarketingOverviewRepository } from './repository/repositories/marketing-overview.repository';
import { MarketingSavedAudienceRepository } from './repository/repositories/marketing-saved-audience.repository';
import { MarketingAudienceService } from './services/marketing-audience.service';
import { MarketingOverviewService } from './services/marketing-overview.service';
import { MarketingSavedAudienceService } from './services/marketing-saved-audience.service';

/** Tiếp thị v2 (#502 onward): Tổng quan and audiences now, sending later. */
@Module({
    imports: [
        MikroOrmModule.forFeature([
            CustomerEntity,
            MarketingSavedAudienceEntity,
        ]),
    ],
    providers: [
        MarketingOverviewRepository,
        MarketingOverviewService,
        MarketingAudienceRepository,
        MarketingAudienceService,
        MarketingSavedAudienceRepository,
        MarketingSavedAudienceService,
    ],
    exports: [
        MarketingOverviewService,
        MarketingAudienceService,
        MarketingSavedAudienceService,
    ],
})
export class MarketingModule {}
