import { ChatbotTimezoneService } from './chatbot-timezone.service';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage } from 'http';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import { getInternalTokenHeader } from '@app/common/utils/ai-internal-headers.util';
import { ToolSpec } from 'src/modules/tool/interfaces/tool-spec.interface';
import {
    parseWireTokenUsage,
    TokenUsageDelta,
} from '../interfaces/token-usage-wire.interface';
import {
    AI_STREAM_IDLE_TIMEOUT_MS,
    CONVERSATION_MEMORY_HTTP_TIMEOUT_MS,
} from '../constants/chatbot-ai.constant';

export interface AIChatHistoryMessage {
    role: 'user' | 'assistant';
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
    /** The messages before `history`, summarized. */
    summary?: string;
    history?: AIChatHistoryMessage[];
    trigger_message_id?: string;
    /** Where the timezones come from; sent to apps/ai resolved (#292). */
    zones: {
        chatbot: { timezone?: string | null };
        conversation?: { timezone?: string | null } | null;
    };
}

/** A burst's images for apps/ai to describe (stored ones already signed). */
export interface AIDescribeImagesParams {
    chatbot_id: string;
    /** `sticker`: read for what it means, not described like a photo. */
    images: { id: string; url: string; kind?: 'sticker' }[];
}

/** One description per image (null when apps/ai could not make or screen
 *  one), and the vision call's token usage. */
export interface AIDescribedImages {
    images: { id: string; description: string | null }[];
    usage?: TokenUsageDelta;
}

/** Messages that left a conversation's history window, to fold into its
 *  summary. */
export interface AISummarizeParams {
    /** Whose input guardrail screens the new summary. */
    chatbot_id: string;
    previous_summary?: string;
    messages: { role: 'customer' | 'bot' | 'operator'; text: string }[];
}

/** The new summary ("" when apps/ai could not make one, or when `blocked`:
 *  the input guardrail stopped it) and what it cost. */
export interface AISummary {
    summary: string;
    blocked?: boolean;
    usage?: TokenUsageDelta;
    model?: string;
}

@Injectable()
export class ChatbotAIService {
    private readonly aiBackendUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly timezoneService: ChatbotTimezoneService
    ) {
        this.aiBackendUrl = this.configService.get<string>('ai.backend.url');
    }

    async streamChat(
        params: AIChatStreamParams,
        signal?: AbortSignal
    ): Promise<IncomingMessage> {
        const headers = await this.buildHeaders();
        // apps/ai binds X-Request-ID to its logs and Sentry scope (#87).
        if (params.conversation_id) {
            headers['X-Request-ID'] = params.conversation_id;
        }
        const { zones, ...body } = params;
        const resolved = this.timezoneService.resolve(
            zones.chatbot,
            zones.conversation
        );
        const response = await this.httpService.axiosRef.post(
            `${this.aiBackendUrl}/api/chat/stream`,
            {
                ...body,
                agent_timezone: resolved.agent,
                customer_timezone: resolved.customer,
            },
            {
                responseType: 'stream',
                signal,
                headers,
                timeout: AI_STREAM_IDLE_TIMEOUT_MS,
            }
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

    async summarizeConversation(params: AISummarizeParams): Promise<AISummary> {
        const response = await this.httpService.axiosRef.post<{
            data: {
                summary: string;
                blocked?: boolean;
                usage?: unknown;
                model?: string;
            };
        }>(`${this.aiBackendUrl}/api/chat/summarize`, params, {
            headers: await this.buildHeaders(),
            timeout: CONVERSATION_MEMORY_HTTP_TIMEOUT_MS,
        });
        const { summary, blocked, usage, model } = response.data.data;
        return {
            summary,
            blocked,
            usage: parseWireTokenUsage(usage) ?? undefined,
            model,
        };
    }

    async deleteSession(sessionId: string): Promise<void> {
        const headers = await this.buildHeaders();
        await this.httpService.axiosRef.delete(
            `${this.aiBackendUrl}/api/chat/session/${sessionId}`,
            { headers }
        );
    }

    private async buildHeaders(): Promise<Record<string, string>> {
        return {
            ...(await getInternalAuthHeader(this.aiBackendUrl)),
            ...getInternalTokenHeader(this.configService),
        };
    }
}
