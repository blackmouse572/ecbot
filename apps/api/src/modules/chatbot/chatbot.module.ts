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

@Module({
    imports: [
        ChatbotRepositoryModule,
        WorkSpaceModule,
        ToolModule,
        AiCacheModule,
        HttpModule.register({ timeout: 1000 * 60 }),
        ConfigModule,
        JwtModule,
    ],
    exports: [
        ChatbotService,
        ChatbotAIService,
        ChatbotModelCatalogService,
        ChatbotAiSseStreamService,
        ChatbotPreviewService,
        ChatbotPreviewSessionService,
        ChatbotShareTokenService,
    ],
    providers: [
        ChatbotService,
        ChatbotAIService,
        ChatbotModelCatalogService,
        ChatbotAiSseStreamService,
        ChatbotPreviewService,
        ChatbotPreviewSessionService,
        ChatbotShareTokenService,
    ],
    controllers: [],
})
export class ChatbotModule {}
