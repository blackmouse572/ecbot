import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_MESSAGE_AUTHOR } from '../../enums/message.enum';
import { ConversationEntity } from '../entities/conversation.entity';
import { ConversationReadEntity } from '../entities/conversation-read.entity';

@Injectable()
export class ConversationReadRepository extends DatabaseRepository<ConversationReadEntity> {
    constructor(em: EntityManager) {
        super(em, ConversationReadEntity);
    }

    async upsertRead(
        operatorId: string,
        conversationId: string
    ): Promise<void> {
        const now = new Date();
        await this.em.upsert(
            ConversationReadEntity,
            {
                operatorId,
                conversation: this.em.getReference(
                    ConversationEntity,
                    conversationId
                ),
                lastReadAt: now,
            },
            {
                onConflictFields: ['operatorId', 'conversation'],
                onConflictMergeFields: ['lastReadAt'],
            }
        );
    }

    async findByOperatorConversation(
        operatorId: string,
        conversationId: string
    ): Promise<ConversationReadEntity | null> {
        return this.findOne({
            operatorId,
            conversation: this.em.getReference(
                ConversationEntity,
                conversationId
            ),
        });
    }

    /**
     * Returns a map of conversationId → unread USER-message count for a given operator.
     * workspaceId is joined via chatbot as defense-in-depth tenant isolation.
     */
    async getUnreadCounts(
        operatorId: string,
        conversationIds: string[],
        workspaceId: string
    ): Promise<Map<string, number>> {
        if (conversationIds.length === 0) return new Map();

        // Strict `>` — timestamptz is microsecond-precision; same-instant collisions
        // between a message arrival and a mark-read upsert are negligible.
        const rows: { conversation_id: string; unread_count: string }[] =
            await this.em.getConnection().execute(
                `
                SELECT
                    m.conversation_id,
                    COUNT(*) AS unread_count
                FROM messages m
                JOIN conversations conv ON conv.id = m.conversation_id
                JOIN chatbots cb ON cb.id = conv.chatbot_id
                LEFT JOIN conversation_reads cr
                    ON cr.conversation_id = m.conversation_id
                    AND cr.operator_id = ?
                WHERE m.author_type = ?
                    AND m.conversation_id IN (?)
                    AND cb.workspace_id = ?::uuid
                    AND m.deleted_at IS NULL
                    AND (cr.last_read_at IS NULL OR m.date_sent > cr.last_read_at)
                GROUP BY m.conversation_id
                `,
                [
                    operatorId,
                    ENUM_MESSAGE_AUTHOR.USER,
                    conversationIds,
                    workspaceId,
                ]
            );

        const result = new Map<string, number>();
        for (const row of rows) {
            result.set(row.conversation_id, parseInt(row.unread_count, 10));
        }
        return result;
    }
}
