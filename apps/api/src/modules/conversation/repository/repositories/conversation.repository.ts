import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_CONVERSATION_STATUS } from '../../enums/conversation.enum';
import { ConversationEntity } from '../entities/conversation.entity';

@Injectable()
export class ConversationRepository extends DatabaseRepository<ConversationEntity> {
    constructor(em: EntityManager) {
        super(em, ConversationEntity);
    }

    async findByChatbotAccountSender(
        chatbotId: string,
        accountId: string,
        senderId: string
    ): Promise<ConversationEntity | null> {
        return this.findOne({
            chatbot: chatbotId,
            account: accountId,
            senderId,
            deletedAt: null,
        } as any);
    }

    async findOneByIdInWorkspace(
        id: string,
        workspaceId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ConversationEntity | null> {
        const filter: Record<string, any> = {
            id,
            chatbot: { workspace: workspaceId },
            deletedAt: null,
        };
        return this.findOne(filter as any, options);
    }

    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ConversationEntity[]> {
        const filter: Record<string, any> = {
            chatbot: { workspace: workspaceId },
            deletedAt: null,
            ...find,
        };

        return this.find(filter as any, {
            populate: ['chatbot', 'account'] as any,
            ...options,
        });
    }

    async countByWorkspace(
        workspaceId: string,
        find?: Record<string, any>
    ): Promise<number> {
        const filter: Record<string, any> = {
            chatbot: { workspace: workspaceId },
            deletedAt: null,
            ...find,
        };

        return this.em.count(ConversationEntity, filter as any, {
            populate: ['chatbot', 'account'] as any,
        });
    }
}
