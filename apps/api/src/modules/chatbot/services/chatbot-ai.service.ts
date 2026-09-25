import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage } from 'http';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import { ToolSpec } from 'src/modules/tool/interfaces/tool-spec.interface';
import {
    parseWireTokenUsage,
    TokenUsageDelta,
} from '../interfaces/token-usage-wire.interface';

export interface AIChatHistoryMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AIChatStreamParams {
    chatbot_id: string;
    user_id: string;
    provider_id: string;
    message: string;
    chat_session_id?: string;
    tools?: ToolSpec[];
    max_tool_iterations?: number;
    conversation_id?: string;
    customer_id?: string;
    contact_point_id?: string;
    history?: AIChatHistoryMessage[];
    trigger_message_id?: string;
}

/** A burst's images for apps/ai to describe (stored ones already signed). */
export interface AIDescribeImagesParams {
    chatbot_id: string;
    images: { id: string; url: string }[];
}

/** One description per image (null when apps/ai could not make or screen
 *  one), and the vision call's token usage. */
export interface AIDescribedImages {
    images: { id: string; description: string | null }[];
    usage?: TokenUsageDelta;
}

@Injectable()
export class ChatbotAIService {
    private readonly aiBackendUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.aiBackendUrl = this.configService.get<string>('ai.backend.url');
    }

    async streamChat(
        params: AIChatStreamParams,
        signal?: AbortSignal
    ): Promise<IncomingMessage> {
        const headers = await getInternalAuthHeader(this.aiBackendUrl);
        const response = await this.httpService.axiosRef.post(
            `${this.aiBackendUrl}/api/chat/stream`,
            params,
            { responseType: 'stream', signal, headers }
        );
        return response.data as IncomingMessage;
    }

    async describeImages(
        params: AIDescribeImagesParams
    ): Promise<AIDescribedImages> {
        const headers = await getInternalAuthHeader(this.aiBackendUrl);
        const response = await this.httpService.axiosRef.post<{
            data: { images: AIDescribedImages['images']; usage?: unknown };
        }>(`${this.aiBackendUrl}/api/chat/describe`, params, { headers });
        const { images, usage } = response.data.data;
        return { images, usage: parseWireTokenUsage(usage) ?? undefined };
    }

    async deleteSession(sessionId: string): Promise<void> {
        const headers = await getInternalAuthHeader(this.aiBackendUrl);
        await this.httpService.axiosRef.delete(
            `${this.aiBackendUrl}/api/chat/session/${sessionId}`,
            { headers }
        );
    }
}
