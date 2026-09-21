import {
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    Optional,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { IncomingMessage } from 'http';
import { ENUM_AI_USAGE_STATUS_CODE_ERROR } from 'src/app/enums/ai-usage.status-code.enum';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotAIService } from './chatbot-ai.service';
import { ChatbotAiSseStreamService } from './chatbot-ai-sse-stream.service';
import { ChatbotPreviewSessionService } from './chatbot-preview-session.service';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from 'src/app/ai-usage-meter.interface';

export interface IPreviewStreamParams {
    chatbot: ChatbotEntity;
    /** Server-derived Redis key — see ChatbotPreviewSessionService. */
    sessionKey: string;
    message: string;
    userId: string;
    chatSessionId?: string;
}

/**
 * Runs one preview turn end to end: read history, call apps/ai, stream the
 * reply to the browser, then persist the exchange.
 *
 * Both the authed operator preview and the public share-link preview go
 * through here. The transport half — SSE framing, error sanitizing, abort
 * handling, transcript capture — lives in ChatbotAiSseStreamService; what
 * remains here is preview-specific: the ephemeral Redis transcript that is a
 * preview's whole persistence model. The website widget shares the former and
 * deliberately not the latter, since its conversations are real and live in
 * Postgres.
 */
@Injectable()
export class ChatbotPreviewService {
    private readonly logger = new Logger(ChatbotPreviewService.name);

    constructor(
        private readonly chatbotAIService: ChatbotAIService,
        private readonly sessionService: ChatbotPreviewSessionService,
        private readonly sseStream: ChatbotAiSseStreamService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    async streamTo(
        res: ExpressResponse,
        params: IPreviewStreamParams
    ): Promise<void> {
        const { chatbot, sessionKey, message, userId, chatSessionId } = params;
        const history = await this.sessionService.read(sessionKey);

        // Unlike the customer-facing paths, an operator gets the real reason:
        // a preview that silently answers with the fallback line would read as
        // a broken bot rather than an exhausted budget. No meter at all is the
        // public build: the turn is allowed and left unrecorded.
        const budget = (await this.meter?.check(
            chatbot.workspace.id,
            chatbot
        )) ?? { allowed: true };
        if (!budget.allowed) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_AI_USAGE_STATUS_CODE_ERROR.QUOTA_EXHAUSTED,
                message: 'tokenUsage.error.quotaExhausted',
                errors: { reason: budget.reason },
            });
        }

        const abort = new AbortController();

        let upstream: IncomingMessage;
        try {
            upstream = await this.chatbotAIService.streamChat(
                {
                    chatbot_id: chatbot.id,
                    user_id: userId,
                    provider_id: chatbot.modelProvider,
                    message,
                    chat_session_id: chatSessionId,
                    history,
                },
                abort.signal
            );
        } catch {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'chatbot.error.aiBackendUnavailable',
            });
        }

        await this.sseStream.pipe({
            res,
            upstream,
            abort,
            logContext: `chatbot ${chatbot.id}`,
            onFinalize: assistantText =>
                this.sessionService.writeTurn(
                    sessionKey,
                    message,
                    assistantText
                ),
            onUsage: async usage => {
                await this.meter?.record({
                    workspaceId: chatbot.workspace.id,
                    usage,
                    source: ENUM_AI_USAGE_SOURCE.PREVIEW,
                    chatbotId: chatbot.id,
                    model: chatbot.modelTextName,
                });
            },
        });
    }
}
