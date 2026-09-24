import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage } from 'http';
import { getInternalAuthHeader } from '@app/common/utils/gcp-id-token.util';
import { getInternalTokenHeader } from '@app/common/utils/ai-internal-headers.util';
import { ToolSpec } from 'src/modules/tool/interfaces/tool-spec.interface';

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
    history?: AIChatHistoryMessage[];
    trigger_message_id?: string;
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
        const headers = await this.buildHeaders();
        const response = await this.httpService.axiosRef.post(
            `${this.aiBackendUrl}/api/chat/stream`,
            params,
            { responseType: 'stream', signal, headers }
        );
        return response.data as IncomingMessage;
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
