import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MarketingMessageEntity } from './repository/entities/marketing-message.entity';
import { MarketingSavedAudienceEntity } from './repository/entities/marketing-saved-audience.entity';
import { MarketingSettingsEntity } from './repository/entities/marketing-settings.entity';
import { MarketingAudienceRepository } from './repository/repositories/marketing-audience.repository';
import { MarketingOverviewRepository } from './repository/repositories/marketing-overview.repository';
import { MarketingSavedAudienceRepository } from './repository/repositories/marketing-saved-audience.repository';
import { MarketingSettingsRepository } from './repository/repositories/marketing-settings.repository';
import { MarketingAudienceService } from './services/marketing-audience.service';
import { MarketingOverviewService } from './services/marketing-overview.service';
import { MarketingSavedAudienceService } from './services/marketing-saved-audience.service';
import { MarketingSettingsService } from './services/marketing-settings.service';

/** Tiếp thị v2 (#502 onward): Tổng quan, audiences and the send rules. */
@Module({
    imports: [
        MikroOrmModule.forFeature([
            CustomerEntity,
            MarketingSavedAudienceEntity,
            MarketingSettingsEntity,
            MarketingMessageEntity,
        ]),
    ],
    providers: [
        MarketingOverviewRepository,
        MarketingOverviewService,
        MarketingAudienceRepository,
        MarketingAudienceService,
        MarketingSavedAudienceRepository,
        MarketingSavedAudienceService,
        MarketingSettingsRepository,
        MarketingSettingsService,
    ],
    exports: [
        MarketingOverviewService,
        MarketingAudienceService,
        MarketingSavedAudienceService,
        MarketingSettingsService,
    ],
})
export class MarketingModule {}
