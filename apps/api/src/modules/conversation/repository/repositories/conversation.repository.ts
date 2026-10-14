import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';
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
            ...withLastMessageOrder(options),
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

/**
 * Newest message first, rows without a lastMessageAt (older conversations)
 * last instead of on top as Postgres puts nulls on DESC, then newest created.
 */
function withLastMessageOrder(
    options?: IDatabaseFindAllOptions
): IDatabaseFindAllOptions | undefined {
    const direction = options?.order?.lastMessageAt;
    if (!direction) return options;
    const { order: _order, ...rest } = options;
    const asc = direction === ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
    return {
        ...rest,
        orderBy: {
            lastMessageAt: asc
                ? QueryOrder.ASC_NULLS_LAST
                : QueryOrder.DESC_NULLS_LAST,
            createdAt: asc ? QueryOrder.ASC : QueryOrder.DESC,
        },
    };
}
