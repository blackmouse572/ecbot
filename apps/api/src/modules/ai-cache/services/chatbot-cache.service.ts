import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';

/**
 * Drops apps/ai's cached copy of a chatbot's config.
 *
 * apps/ai caches the chatbot row (config, tools, skills) per request but does
 * not own the writes, so it cannot notice a change on its own. Lives in its own
 * module rather than ChatbotModule so tool/skill modules can inject it without
 * a circular import (ChatbotModule already imports ToolModule).
 */
@Injectable()
export class ChatbotCacheService {
    private readonly logger = new Logger(ChatbotCacheService.name);
    private readonly aiBackendUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.aiBackendUrl = this.configService.get<string>('ai.backend.url');
    }

    /** Best-effort: a failed invalidation must never fail the write that triggered it. */
    async invalidate(chatbotId: string): Promise<void> {
        try {
            const headers = await getInternalAuthHeader(this.aiBackendUrl);
            await this.httpService.axiosRef.delete(
                `${this.aiBackendUrl}/api/chat/chatbot-cache/${chatbotId}`,
                { headers }
            );
        } catch (error) {
            // The TTL on the apps/ai side is the backstop for this.
            this.logger.warn(
                `Failed to invalidate chatbot cache for ${chatbotId}: ${error?.message}`
            );
        }
    }
}
