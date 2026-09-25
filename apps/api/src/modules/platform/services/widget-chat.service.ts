import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { botImage } from '@app/modules/conversation/utils/message-attachment';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ChatbotAIService } from '@app/modules/chatbot/services/chatbot-ai.service';
import { ChatbotAiSseStreamService } from '@app/modules/chatbot/services/chatbot-ai-sse-stream.service';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ConversationService } from '@app/modules/conversation/services/conversation.service';
import { CustomerService } from '@app/modules/customer/services/customer.service';
import {
    Inject,
    Injectable,
    InternalServerErrorException,
    Optional,
    UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response as ExpressResponse } from 'express';
import { IncomingMessage } from 'http';
import { ENUM_WIDGET_STATUS_CODE_ERROR } from '../enums/widget.status-code.enum';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from '@app/app/ai-usage-meter.interface';
import { TurnContextService } from './turn-context.service';

export interface IWidgetTurn {
    /** WEBSITE_WIDGET account with `chatbot` and `workspace` populated. */
    account: AccountEntity;
    /** Anonymous id the visitor's browser persists in localStorage. */
    visitorId: string;
    text: string;
    /** Caller-supplied id — resending it must not create a second message. */
    messageId: string;
}

/**
 * Runs one website-widget turn: persist the visitor's message through the same
 * primitives the async pipeline uses, then stream the reply back on the same
 * request.
 *
 * This deliberately does not go through the Inbound Inbox, the 3s debounce or
 * the generation lease. Those exist to make platform-pushed webhooks durable, to
 * coalesce bursts arriving on separate requests, and to let a newer message
 * supersede an in-flight generation. A widget turn is one HTTP request the
 * browser is holding open: it is its own durability, there is no burst to
 * coalesce (the UI blocks input while streaming), and nothing to supersede.
 * Routing it through the queue as well would generate the reply twice.
 *
 * What it does share is every piece that owns state — contact point, conversation
 * and message persistence — so a widget conversation is indistinguishable from a
 * Messenger one in the operator inbox.
 */
@Injectable()
export class WidgetChatService {
    constructor(
        private readonly customerService: CustomerService,
        private readonly conversationService: ConversationService,
        private readonly messageRepository: MessageRepository,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly sseStream: ChatbotAiSseStreamService,
        private readonly turnContext: TurnContextService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    async handleTurn(res: ExpressResponse, turn: IWidgetTurn): Promise<void> {
        const { account, visitorId, text, messageId } = turn;
        const chatbot = account.chatbot;
        if (!chatbot) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.NO_CHATBOT_ATTACHED,
                message: 'widget.error.noChatbotAttached',
            });
        }

        const { contactPoint, customerId } =
            await this.customerService.resolveContactPoint({
                workspaceId: account.workspace.id,
                platform: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                externalSenderId: visitorId,
            });

        const conversation = await this.conversationService.findOrCreate({
            chatbotId: chatbot.id,
            accountId: account.id,
            senderId: visitorId,
            contactPointId: contactPoint.id,
        });

        await this.messageRepository.upsertByExternalId(
            conversation.id,
            messageId,
            {
                direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                authorType: ENUM_MESSAGE_AUTHOR.USER,
                authorId: visitorId,
                text,
                dateSent: new Date(),
            }
        );
        await this.conversationService.touchLastMessage(
            chatbot.id,
            account.id,
            visitorId
        );

        // Handoff: an operator has taken over, so the visitor's message is
        // recorded for the inbox but the bot stays quiet. Their poll picks up
        // the operator's reply.
        if (!conversation.botEnabled) {
            this.endStreamQuietly(res);
            return;
        }

        const { history } = await this.turnContext.build(conversation.id, [
            text,
        ]);

        // Out of tokens: answer with the fallback line over the same stream the
        // widget is already reading, rather than failing the request.
        // No meter is the public build: allowed, and nothing recorded below.
        const budget = (await this.meter?.check(
            account.workspace.id,
            chatbot
        )) ?? { allowed: true };
        if (!budget.allowed) {
            this.streamFallback(res, chatbot.fallbackMessage);
            return;
        }

        const abort = new AbortController();
        let upstream: IncomingMessage;
        try {
            upstream = await this.chatbotAIService.streamChat(
                {
                    chatbot_id: chatbot.id,
                    user_id: visitorId,
                    provider_id: chatbot.modelProvider,
                    message: text,
                    conversation_id: conversation.id,
                    customer_id: customerId,
                    contact_point_id: contactPoint.id,
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
            logContext: `widget account ${account.id}`,
            onFinalize: (assistantText, images) =>
                this.persistReply(conversation.id, assistantText, images),
            onUsage: async usage => {
                await this.meter?.record({
                    workspaceId: account.workspace.id,
                    usage,
                    source: ENUM_AI_USAGE_SOURCE.WIDGET,
                    chatbotId: chatbot.id,
                    accountId: account.id,
                    platform: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                    model: chatbot.modelTextName,
                    conversationId: conversation.id,
                });
            },
        });
    }

    /**
     * The same window the async pipeline gives the agent, read from Postgres
     * rather than a cache: a widget conversation is durable, and an expiring
     * cache would leave the bot with less context than the operator can see.
     */
    private async persistReply(
        conversationId: string,
        text: string,
        images: string[]
    ): Promise<void> {
        // The row IS the delivery for this channel — the visitor already saw the
        // stream, and their poll reads this back on the next page load.
        const attachments = images.map(botImage);
        const nonce = randomUUID();
        await this.messageRepository.insertPendingOutbound(
            conversationId,
            nonce,
            {
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
                authorId: 'bot',
                text,
                attachments: attachments.length ? attachments : undefined,
                dateSent: new Date(),
            }
        );
        await this.messageRepository.markOutboundSent(nonce, nonce);
    }

    /**
     * Close the SSE response with a well-formed terminator so the widget's chat
     * client settles instead of hanging on an aborted stream.
     */
    /**
     * Emit one complete UI-message-stream turn carrying `message`, so the widget
     * renders it like any other reply instead of showing a transport error.
     */
    private streamFallback(res: ExpressResponse, message?: string): void {
        if (!message) return this.endStreamQuietly(res);

        const frame = (part: object) => `data: ${JSON.stringify(part)}\n\n`;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
        res.write(frame({ type: 'start', messageId: randomUUID() }));
        res.write(frame({ type: 'text-start', id: 'fallback' }));
        res.write(
            frame({ type: 'text-delta', id: 'fallback', delta: message })
        );
        res.write(frame({ type: 'text-end', id: 'fallback' }));
        res.write(frame({ type: 'finish' }));
        res.write('data: [DONE]\n\n');
        res.end();
    }

    private endStreamQuietly(res: ExpressResponse): void {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
        res.write('data: [DONE]\n\n');
        res.end();
    }
}
