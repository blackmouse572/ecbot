import { AccountRepositoryModule } from '@app/modules/account/repository/account.repository.module';
import { ChatbotRepositoryModule } from '@app/modules/chatbot/repository/chatbot.repository.module';
import { ChatbotService } from '@app/modules/chatbot/services/chatbot.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AiCacheModule } from 'src/modules/ai-cache/ai-cache.module';
import { ToolModule } from '../tool/tool.module';
import { WorkSpaceModule } from '../workspace/workspace.module';
import { ChatbotAIService } from './services/chatbot-ai.service';
import { ChatbotModelCatalogService } from './services/chatbot-model-catalog.service';
import { ChatbotAiSseStreamService } from './services/chatbot-ai-sse-stream.service';
import { ChatbotPreviewService } from './services/chatbot-preview.service';
import { ChatbotPreviewSessionService } from './services/chatbot-preview-session.service';
import { ChatbotShareTokenService } from './services/chatbot-share-token.service';
import { ChatbotTimezoneService } from './services/chatbot-timezone.service';
import { ChatbotPreviewMediaService } from './services/chatbot-preview-media.service';
import { AwsModule } from '@app/modules/aws/aws.module';
import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';

@Module({
    imports: [
        ChatbotRepositoryModule,
        AccountRepositoryModule,
        WorkSpaceModule,
        ToolModule,
        AiCacheModule,
        HttpModule.register({ timeout: 1000 * 60 }),
        ConfigModule,
        JwtModule,
        AwsModule,
    ],
    exports: [
        ChatbotService,
        ChatbotAIService,
        ChatbotModelCatalogService,
        ChatbotAiSseStreamService,
        ChatbotPreviewService,
        ChatbotPreviewSessionService,
        ChatbotShareTokenService,
        ChatbotTimezoneService,
        ChatbotPreviewMediaService,
    ],
    providers: [
        ChatbotService,
        ChatbotAIService,
        ChatbotModelCatalogService,
        ChatbotAiSseStreamService,
        ChatbotPreviewService,
        ChatbotPreviewSessionService,
        ChatbotShareTokenService,
        ChatbotTimezoneService,
        ChatbotPreviewMediaService,
        // Stateless over S3; provided here too because ConversationModule
        // imports this module.
        MessageMediaService,
    ],
    controllers: [],
})
export class ChatbotModule {}
