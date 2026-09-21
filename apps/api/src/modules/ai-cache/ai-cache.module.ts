import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotCacheService } from 'src/modules/ai-cache/services/chatbot-cache.service';

@Module({
    imports: [HttpModule.register({ timeout: 5000 }), ConfigModule],
    providers: [ChatbotCacheService],
    exports: [ChatbotCacheService],
    controllers: [], // per project convention — controllers register in routes.{access}.module.ts
})
export class AiCacheModule {}
