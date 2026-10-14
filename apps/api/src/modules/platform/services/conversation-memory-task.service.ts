import {
    AI_USAGE_METER,
    AiUsageMeter,
    ENUM_AI_USAGE_SOURCE,
} from '@app/app/ai-usage-meter.interface';
import {
    AISummarizeParams,
    ChatbotAIService,
} from '@app/modules/chatbot/services/chatbot-ai.service';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { historyNote } from '@app/modules/conversation/utils/message-attachment';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import {
    CONVERSATION_MEMORY_MAX_ATTEMPTS,
    CONVERSATION_MEMORY_QUEUE,
    CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES,
} from '../constants/conversation-memory.constant';
import { ConversationMemoryTaskDto } from '../dtos/conversation-memory.task.dto';

/**
 * Folds the messages that left a conversation's history window into its
 * summary (queued by ConversationMemoryService). The cursor the job was
 * queued at must still be the conversation's, so a late or repeated job
 * never folds the same messages in twice.
 */
@Injectable()
export class ConversationMemoryTaskService {
    private readonly logger = new Logger(ConversationMemoryTaskService.name);

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly messageRepository: MessageRepository,
        private readonly chatbotAIService: ChatbotAIService,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    async handle(
        dto: ConversationMemoryTaskDto,
        retryCount: number
    ): Promise<void> {
        try {
            await this.summarize(dto);
        } catch (err) {
            const attempt = retryCount + 1;
            this.logger.warn(
                `Conversation summary failed for ${dto.conversationId} (attempt ${attempt}/${CONVERSATION_MEMORY_MAX_ATTEMPTS}): ${(err as Error).message}`
            );
            if (attempt >= CONVERSATION_MEMORY_MAX_ATTEMPTS) {
                // Acknowledge: the next window step queues a job from the
                // same cursor, which covers these messages too.
                Sentry.captureException(err, {
                    tags: {
                        queue: CONVERSATION_MEMORY_QUEUE,
                        conversation_id: dto.conversationId,
                    },
                });
                return;
            }
            throw err;
        }
    }

    private async summarize(dto: ConversationMemoryTaskDto): Promise<void> {
        const conversation =
            await this.conversationRepository.findOneById<ConversationEntity>(
                dto.conversationId,
                { populate: ['chatbot', 'chatbot.workspace'] } as any
            );
        if (!conversation) {
            this.logger.debug(
                `Summary skipped: no conversation ${dto.conversationId}`
            );
            return;
        }
        const cursorId = conversation.memorySummaryUntilId ?? undefined;
        if (cursorId !== dto.fromMessageId) {
            this.logger.debug(
                `Summary skipped for ${dto.conversationId}: cursor moved since queued`
            );
            return;
        }

        const { chatbot } = conversation;
        const workspaceId = chatbot.workspace.id;
        // Memory is a nicety: a workspace out of tokens goes without it.
        const budget = (await this.meter?.check(workspaceId, chatbot)) ?? {
            allowed: true,
        };
        if (!budget.allowed) {
            this.logger.debug(
                `Summary skipped for ${dto.conversationId}: workspace out of tokens`
            );
            return;
        }

        const filter = await this.messageRepository.untilFilter(
            dto.conversationId,
            await this.messageRepository.afterCursorFilter(
                dto.conversationId,
                cursorId
            ),
            dto.untilMessageId
        );
        if (!filter) {
            // The next window step queues a job with a new bound.
            this.logger.debug(
                `Summary skipped for ${dto.conversationId}: message ${dto.untilMessageId} is gone`
            );
            return;
        }
        // Oldest first: a range over the cap is folded from its start and
        // the cursor stops at the last folded row, so nothing is skipped;
        // the next Turn queues the rest from the new cursor.
        const rows = await this.messageRepository.findOldest(
            filter,
            CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES
        );
        const untilId =
            rows.length === CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES
                ? rows[rows.length - 1].id
                : dto.untilMessageId;
        if (untilId !== dto.untilMessageId) {
            this.logger.debug(
                `Summary for ${dto.conversationId} folds ${rows.length} messages up to ${untilId}; the rest goes in a later job`
            );
        }

        const result = await this.chatbotAIService.summarizeConversation({
            chatbot_id: chatbot.id,
            previous_summary: conversation.memorySummary ?? undefined,
            messages: rows
                .map(m => this.toSummaryMessage(m))
                .filter(m => m.text),
        });
        if (result.usage) {
            await this.meter
                ?.record({
                    workspaceId,
                    usage: result.usage,
                    source: ENUM_AI_USAGE_SOURCE.CONVERSATION_MEMORY,
                    chatbotId: chatbot.id,
                    model: result.model,
                    conversationId: dto.conversationId,
                })
                .catch((err: unknown) =>
                    this.logger.warn(
                        `Conversation summary usage not recorded for ${dto.conversationId}: ${err}`
                    )
                );
        }
        if (result.blocked) {
            // Retrying would block again: keep the old summary and move on.
            this.logger.warn(
                `Summary for ${dto.conversationId} blocked by the input guardrail`
            );
        } else if (!result.summary) {
            throw new Error('apps/ai returned no summary');
        }

        await this.conversationRepository.updateEntity(
            { id: dto.conversationId, memorySummaryUntilId: cursorId ?? null },
            {
                memorySummary: result.blocked
                    ? conversation.memorySummary
                    : result.summary,
                memorySummaryUntilId: untilId,
            }
        );
    }

    private toSummaryMessage(
        m: MessageEntity
    ): AISummarizeParams['messages'][number] {
        const inbound = m.direction === ENUM_MESSAGE_DIRECTION.INBOUND;
        return {
            role: inbound
                ? 'customer'
                : m.authorType === ENUM_MESSAGE_AUTHOR.OPERATOR
                  ? 'operator'
                  : 'bot',
            text: [m.text, inbound ? historyNote(m.attachments ?? []) : '']
                .filter(Boolean)
                .join(' '),
        };
    }
}
