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

    async window(conversationId: string): Promise<IMemoryWindow> {
        const filter =
            await this.messageRepository.afterCursorFilter(conversationId);
        const total = await this.messageRepository.countWhere(filter);
        const rows = await this.messageRepository.findNewest(
            filter,
            total - memoryWindowDrop(total)
        );
        return { rows };
    }
}
