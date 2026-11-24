import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { ConversationRepositoryModule } from '@app/modules/conversation/repository/conversation.repository.module';
import { CloudTasksQueueModule } from '@app/worker/cloud-tasks-queue.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { MarketingMessageEntity } from './repository/entities/marketing-message.entity';
import { MarketingSendEntity } from './repository/entities/marketing-send.entity';
import { MarketingSavedAudienceEntity } from './repository/entities/marketing-saved-audience.entity';
import { MarketingSettingsEntity } from './repository/entities/marketing-settings.entity';
import { MarketingAudienceRepository } from './repository/repositories/marketing-audience.repository';
import { MarketingMessageRepository } from './repository/repositories/marketing-message.repository';
import { MarketingSendRepository } from './repository/repositories/marketing-send.repository';
import { MarketingOverviewRepository } from './repository/repositories/marketing-overview.repository';
import { MarketingSavedAudienceRepository } from './repository/repositories/marketing-saved-audience.repository';
import { MarketingSettingsRepository } from './repository/repositories/marketing-settings.repository';
import { MarketingAudienceService } from './services/marketing-audience.service';
import { MarketingOverviewService } from './services/marketing-overview.service';
import { MarketingSavedAudienceService } from './services/marketing-saved-audience.service';
import { MarketingSendService } from './services/marketing-send.service';
import { MarketingSettingsService } from './services/marketing-settings.service';
import { MarketingAutoSendScheduler } from './schedulers/marketing-auto-send.scheduler';

/** Tiếp thị v2 (#502 onward): Tổng quan, audiences, the send rules and sends. */
@Module({
    imports: [
        MikroOrmModule.forFeature([
            CustomerEntity,
            MarketingSavedAudienceEntity,
            MarketingSettingsEntity,
            MarketingMessageEntity,
            MarketingSendEntity,
        ]),
        ConversationRepositoryModule,
        CloudTasksQueueModule,
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
        MarketingSendRepository,
        MarketingMessageRepository,
        MarketingSendService,
        MarketingAutoSendScheduler,
    ],
    exports: [
        MarketingOverviewService,
        MarketingAudienceService,
        MarketingSavedAudienceService,
        MarketingSettingsService,
        MarketingSendService,
    ],
})
export class MarketingModule {}
