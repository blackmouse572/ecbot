import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { Injectable } from '@nestjs/common';
import { IMemoryWindow } from '../interfaces/turn-context.interface';
import { memoryWindowDrop } from '../utils/memory-window.util';

/**
 * The part of a conversation the bot sees each Turn: its newest messages, in
 * a window that moves in steps (see `conversation-memory.constant.ts`).
 */
@Injectable()
export class ConversationMemoryService {
    constructor(private readonly messageRepository: MessageRepository) {}

    /** `burstSize`: the newest rows the Turn answers. They come on top of
     *  the window, so a long burst never eats into the history, and the
     *  window steps on the history count alone. */
    async window(
        conversationId: string,
        burstSize = 0
    ): Promise<IMemoryWindow> {
        const filter =
            await this.messageRepository.afterCursorFilter(conversationId);
        const total = await this.messageRepository.getTotal(filter);
        const history = Math.max(0, total - burstSize);
        const rows = await this.messageRepository.findNewest(
            filter,
            total - memoryWindowDrop(history)
        );
        return { rows };
    }
}
