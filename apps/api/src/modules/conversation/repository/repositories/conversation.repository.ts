import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../enums/conversation.enum';
import { ENUM_MESSAGE_DIRECTION } from '../../enums/message.enum';
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
            // The customer names a sender the platform gave no name (#257).
            populate: [
                'chatbot',
                'account',
                'contactPoint',
                'contactPoint.customer',
            ] as any,
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

    /**
     * The customer's last message on each channel type, for the free-message
     * window. Merged-away profiles hand their ContactPoints to the survivor,
     * so this covers every channel of the merged Customer.
     */
    async lastInboundByChannel(
        customerId: string,
        workspaceId: string
    ): Promise<{ channel: ENUM_ACCOUNT_TYPE; lastInboundAt: Date }[]> {
        const rows: { channel: ENUM_ACCOUNT_TYPE; last_inbound_at: Date }[] =
            await this.em.getConnection().execute(
                `
            SELECT a.type AS channel, MAX(m.date_sent) AS last_inbound_at
            FROM messages m
            JOIN conversations conv ON conv.id = m.conversation_id
            JOIN contact_points cp ON cp.id = conv.contact_point_id
            JOIN accounts a ON a.id = conv.account_id
            JOIN chatbots cb ON cb.id = conv.chatbot_id
            WHERE cp.customer_id = ?::uuid
                AND cb.workspace_id = ?::uuid
                AND m.direction = ?
                AND conv.deleted_at IS NULL
            GROUP BY a.type
            `,
                [customerId, workspaceId, ENUM_MESSAGE_DIRECTION.INBOUND]
            );
        return rows.map(row => ({
            channel: row.channel,
            lastInboundAt: new Date(row.last_inbound_at),
        }));
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
