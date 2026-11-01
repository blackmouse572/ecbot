import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import {
    CONVERSATION_MEMORY_QUEUE,
    CONVERSATION_MEMORY_WINDOW_CAP,
    ENUM_CONVERSATION_MEMORY_PROCESS,
} from '../constants/conversation-memory.constant';
import { IMemoryWindow } from '../interfaces/turn-context.interface';
import { memoryWindowDrop } from '../utils/memory-window.util';

/**
 * The part of a conversation the bot sees each Turn: a summary of the older
 * messages and every newer one (see `conversation-memory.constant.ts`). Once
 * the newer ones pass the window, the oldest steps are queued to be
 * summarized; they stay in view until that lands, up to a cap.
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
        const { conversation, cursorId, filter, total } =
            await this.unsummarized(conversationId);
        const history = Math.max(0, total - burstSize);
        const fold = memoryWindowDrop(history);
        const drop = memoryWindowDrop(history, CONVERSATION_MEMORY_WINDOW_CAP);
        const rows = await this.messageRepository.findNewest(
            filter,
            total - drop
        );
        if (fold) {
            // The cap is past the max, so the last row to fold is in view.
            this.queueSummary(
                conversationId,
                cursorId,
                rows[fold - drop - 1].id
            );
        }
        return { summary: conversation?.memorySummary ?? undefined, rows };
    }

    /** Queue the summary a Turn would queue now, without waiting for one:
     *  when staff hand back, what they said with the bot off is folded in
     *  before the bot's next reply. */
    async catchUp(conversationId: string): Promise<void> {
        const { cursorId, filter, total } =
            await this.unsummarized(conversationId);
        const fold = memoryWindowDrop(total);
        if (!fold) return;
        const [lastFolded] = await this.messageRepository.findNewest(
            filter,
            total - fold + 1
        );
        this.queueSummary(conversationId, cursorId, lastFolded.id);
    }

    private async unsummarized(conversationId: string) {
        const conversation =
            await this.conversationRepository.findOneById(conversationId);
        const cursorId = conversation?.memorySummaryUntilId ?? undefined;
        const filter = await this.messageRepository.afterCursorFilter(
            conversationId,
            cursorId
        );
        const total = await this.messageRepository.getTotal(filter);
        return { conversation, cursorId, filter, total };
    }

    /** Named by the cursor and the last message to fold, so every Turn of
     *  one step queues the same task and Cloud Tasks keeps one, while a job
     *  that folded only part of its range queues the rest itself. */
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
