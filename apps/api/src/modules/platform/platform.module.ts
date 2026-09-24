import { AccountModule } from '@app/modules/account/account.module';
import { AccountRepositoryModule } from '@app/modules/account/repository/account.repository.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CloudTasksQueueModule } from '@app/worker/cloud-tasks-queue.module';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { ChatbotRepositoryModule } from '@app/modules/chatbot/repository/chatbot.repository.module';
import { ConversationModule } from '@app/modules/conversation/conversation.module';
import { ToolModule } from '@app/modules/tool/tool.module';
import { CustomerModule } from '@app/modules/customer/customer.module';
import { ApiChannelPlatformAdapter } from './adapters/api-channel/api-channel.platform-adapter';
import { InstagramPlatformAdapter } from './adapters/instagram/instagram.platform-adapter';
import { MessengerPlatformAdapter } from './adapters/messenger/messenger.platform-adapter';
import { ShopeePlatformAdapter } from './adapters/shopee/shopee.platform-adapter';
import { TelegramPlatformAdapter } from './adapters/telegram/telegram.platform-adapter';
import { TiktokPlatformAdapter } from './adapters/tiktok/tiktok.platform-adapter';
import { WebsitePlatformAdapter } from './adapters/website/website.platform-adapter';
import { WhatsAppPlatformAdapter } from './adapters/whatsapp/whatsapp.platform-adapter';
import { ZaloPlatformAdapter } from './adapters/zalo/zalo.platform-adapter';
import { PLATFORM_ADAPTER } from './interfaces/platform-adapter.interface';
import { PlatformAdapterRegistry } from './services/platform-adapter.registry';
import { MessageProcessorService } from './services/message-processor.service';
import { MessageDebounceService } from './services/message-debounce.service';
import { GenerationLeaseService } from './services/generation-lease.service';
import { InboundEventDedupeService } from './services/inbound-event-dedupe.service';
import { StreamingDelivery } from './services/streaming-delivery.service';
import { ReplyGenerationService } from './services/reply-generation.service';
import { INBOUND_EVENT_QUEUE } from './constants/inbound-event.constant';
import { InboundInboxService } from './services/inbound-inbox.service';
import { InboundEventProcessor } from './processors/inbound-event.processor';
import { ActionRouter } from './services/action-router.service';
import { InboundReconciliationScheduler } from './schedulers/inbound-reconciliation.scheduler';
import { FollowupService } from './services/followup.service';
import { PlatformRepositoryModule } from './repository/platform.repository.module';
import { ApiChannelCallbackService } from './services/api-channel-callback.service';
import { ChannelRateLimitService } from './services/channel-rate-limit.service';
import { WidgetChatService } from './services/widget-chat.service';
import { WidgetSessionService } from './services/widget-session.service';
import { TurnstileModule } from '@app/common/turnstile/turnstile.module';
import { ConversationRepositoryModule } from '@app/modules/conversation/repository/conversation.repository.module';

const ADAPTERS = [
    MessengerPlatformAdapter,
    ZaloPlatformAdapter,
    InstagramPlatformAdapter,
    TiktokPlatformAdapter,
    ShopeePlatformAdapter,
    TelegramPlatformAdapter,
    WhatsAppPlatformAdapter,
    ApiChannelPlatformAdapter,
    WebsitePlatformAdapter,
];

@Module({
    imports: [
        ConfigModule,
        HttpModule.register({ timeout: 1000 * 30 }),
        CloudTasksQueueModule,
        PlatformRepositoryModule,
        BullModule.registerQueueAsync({ name: INBOUND_EVENT_QUEUE }),
        AccountModule,
        AccountRepositoryModule,
        ChatbotModule,
        ChatbotRepositoryModule,
        ToolModule,
        ConversationModule,
        CustomerModule,
        TurnstileModule,
        ConversationRepositoryModule,
    ],
    providers: [
        ...ADAPTERS,
        {
            provide: PLATFORM_ADAPTER,
            useFactory: (...adapters) => adapters,
            inject: ADAPTERS,
        },
        PlatformAdapterRegistry,
        InboundInboxService,
        InboundEventProcessor,
        ApiChannelCallbackService,
        ChannelRateLimitService,
        WidgetSessionService,
        WidgetChatService,
        InboundReconciliationScheduler,
        GenerationLeaseService,
        InboundEventDedupeService,
        StreamingDelivery,
        ReplyGenerationService,
        MessageDebounceService,
        MessageProcessorService,
        ActionRouter,
        FollowupService,
    ],
    exports: [
        PlatformAdapterRegistry,
        InboundInboxService,
        ChannelRateLimitService,
        WidgetSessionService,
        WidgetChatService,
        MessageProcessorService,
        ActionRouter,
        FollowupService,
        ReplyGenerationService,
    ],
})
export class PlatformModule {}
