import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_CONVERSATION_STATUS } from '../../enums/conversation.enum';
import { IConversationCustomerSummary } from '../../interfaces/conversation.interface';
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

    /**
     * Per customer: how many conversations they have and on which channels.
     * Joined via chatbots so only the given workspace is counted.
     */
    async summarizeByCustomerIds(
        customerIds: string[],
        workspaceId: string
    ): Promise<IConversationCustomerSummary[]> {
        if (customerIds.length === 0) return [];

        const rows: {
            customer_id: string;
            conversation_count: string;
            channels: string[];
        }[] = await this.em.getConnection().execute(
            `
            SELECT
                cp.customer_id,
                COUNT(*) AS conversation_count,
                ARRAY_AGG(DISTINCT a.type ORDER BY a.type) AS channels
            FROM conversations conv
            JOIN contact_points cp ON cp.id = conv.contact_point_id
            JOIN accounts a ON a.id = conv.account_id
            JOIN chatbots cb ON cb.id = conv.chatbot_id
            WHERE cp.customer_id IN (?)
                AND cb.workspace_id = ?::uuid
                AND conv.deleted_at IS NULL
            GROUP BY cp.customer_id
            `,
            [customerIds, workspaceId]
        );

        return rows.map(row => ({
            customerId: row.customer_id,
            conversationCount: Number(row.conversation_count),
            channels: row.channels,
        }));
    }
}
