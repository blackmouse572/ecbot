import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import {
    CONVERSATION_MEMORY_QUEUE,
    ENUM_CONVERSATION_MEMORY_PROCESS,
} from '../constants/conversation-memory.constant';
import { IMemoryWindow } from '../interfaces/turn-context.interface';
import { memoryWindowDrop } from '../utils/memory-window.util';

/**
 * The part of a conversation the bot sees each Turn: a summary of the older
 * messages and every newer one, in a window that moves in steps (see
 * `conversation-memory.constant.ts`). When a step drops messages the summary
 * does not cover yet, they are queued to be summarized; until that lands the
 * Turn simply goes without them.
 */
@Injectable()
export class ConversationMemoryService {
    private readonly logger = new Logger(ConversationMemoryService.name);

    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly conversationRepository: ConversationRepository,
        private readonly cloudTasksClient: CloudTasksQueueClient
    ) {}

    /** `burstSize`: the newest rows the Turn answers. They come on top of
     *  the window, so a long burst never eats into the history, and the
     *  window steps on the history count alone. */
    async window(
        conversationId: string,
        burstSize = 0
    ): Promise<IMemoryWindow> {
        const conversation =
            await this.conversationRepository.findOneById(conversationId);
        const cursorId = conversation?.memorySummaryUntilId ?? undefined;
        const filter = await this.messageRepository.afterCursorFilter(
            conversationId,
            cursorId
        );
        const total = await this.messageRepository.getTotal(filter);
        const drop = memoryWindowDrop(Math.max(0, total - burstSize));
        // One more row than the window when it drops: the newest dropped one,
        // which the summary must cover up to.
        const rows = await this.messageRepository.findNewest(
            filter,
            total - drop + (drop ? 1 : 0)
        );
        if (drop) {
            const lastDropped = rows.shift()!;
            this.queueSummary(conversationId, cursorId, lastDropped.id);
        }
        return { summary: conversation?.memorySummary ?? undefined, rows };
    }

    /** Named by the cursor and the last dropped message, so every Turn of
     *  one step queues the same task and Cloud Tasks keeps one, while a job
     *  that folded only part of its range lets the next Turn queue the rest. */
    private queueSummary(
        conversationId: string,
        fromMessageId: string | undefined,
        untilMessageId: string
    ): void {
        this.cloudTasksClient
            .enqueue(
                CONVERSATION_MEMORY_QUEUE,
                ENUM_CONVERSATION_MEMORY_PROCESS.SUMMARIZE,
                { conversationId, fromMessageId, untilMessageId },
                {
                    taskName: `summarize-${conversationId}-${fromMessageId ?? 'start'}-${untilMessageId}`,
                }
            )
            .catch((err: unknown) =>
                this.logger.warn(
                    `Conversation summary not queued for ${conversationId}: ${(err as Error).message}`
                )
            );
    }
}
