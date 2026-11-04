import {
    BadRequestException,
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
import { ENUM_CHATBOT_STATUS_CODE_ERROR } from '../enums/chatbot.status-code.enum';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotAIService } from './chatbot-ai.service';
import { ChatbotAiSseStreamService } from './chatbot-ai-sse-stream.service';
import { ChatbotPreviewSessionService } from './chatbot-preview-session.service';
import { ChatbotPreviewMediaService } from './chatbot-preview-media.service';
import type { ReplyMedia } from '@app/modules/platform/interfaces/message-model';
import { IAssistantToolCall } from '../utils/assistant-transcript.collector';
import { IChatbotPreviewAttachment } from '../interfaces/chatbot-preview-media.interface';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from 'src/app/ai-usage-meter.interface';

export interface IPreviewReply {
    reply: string;
    media: ReplyMedia[];
    toolCalls: IAssistantToolCall[];
    /** A guardrail stopped the reply; `reply` is then empty. */
    blocked: boolean;
}

export interface IPreviewStreamParams {
    chatbot: ChatbotEntity;
    /** Server-derived Redis key — see ChatbotPreviewSessionService. */
    sessionKey: string;
    message: string;
    userId: string;
    chatSessionId?: string;
    /** Files uploaded for this message (ChatbotPreviewMediaService). */
    attachments?: IChatbotPreviewAttachment[];
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
        private readonly media: ChatbotPreviewMediaService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    private refuseEmpty(): never {
        throw new BadRequestException({
            statusCode: ENUM_CHATBOT_STATUS_CODE_ERROR.EMPTY_MESSAGE,
            message: 'chatbot.error.emptyMessage',
        });
    }

    async streamTo(
        res: ExpressResponse,
        params: IPreviewStreamParams
    ): Promise<void> {
        const turn = await this.open(params);
        await this.sseStream.pipe({ res, ...turn });
    }

    /**
     * The same turn as `streamTo`, read to the end and returned whole, for the
     * /client preview (the MCP test_chatbot tool). A failed generation throws
     * instead of returning a partial reply.
     */
    async reply(params: IPreviewStreamParams): Promise<IPreviewReply> {
        const collector = await this.sseStream.collect(await this.open(params));
        if (collector.errored) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'chatbot.error.aiBackendUnavailable',
            });
        }
        return {
            reply: collector.blocked ? '' : collector.assistantText(),
            media: collector.blocked ? [] : collector.media(),
            toolCalls: collector.toolCalls(),
            blocked: collector.blocked,
        };
    }

    /** Checks the budget, reads the history and opens the apps/ai stream. */
    private async open(params: IPreviewStreamParams) {
        const { chatbot, sessionKey, userId, chatSessionId } = params;
        const attachments = params.attachments ?? [];
        if (!params.message.trim() && !attachments.length) this.refuseEmpty();
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

        // Attachments read as a channel's do: the notes follow the text, and
        // the transcript keeps them so later turns remember the photo.
        const described = attachments.length
            ? await this.media.notes(chatbot.id, attachments)
            : undefined;
        const message = [params.message, ...(described?.notes ?? [])]
            .filter(part => part.trim())
            .join('\n');
        // Attachments outside this chatbot's folder are dropped above, so a
        // message of only those is as empty as one with nothing at all.
        if (!message) this.refuseEmpty();
        // Spent whether or not the reply succeeds, so booked on its own and
        // priced at the vision model.
        if (described?.usage) {
            await this.meter?.record({
                workspaceId: chatbot.workspace.id,
                usage: described.usage,
                source: ENUM_AI_USAGE_SOURCE.PREVIEW,
                chatbotId: chatbot.id,
                model: described.model ?? chatbot.modelTextName,
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
                    zones: { chatbot },
                },
                abort.signal
            );
        } catch {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'chatbot.error.aiBackendUnavailable',
            });
        }

        return {
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
        };
    }
}
