import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConversationActivityEntity } from '../entities/conversation-activity.entity';
import { IReplyActivity } from '../../interfaces/conversation-activity.interface';

@Injectable()
export class ConversationActivityRepository extends EntityRepository<ConversationActivityEntity> {
    constructor(em: EntityManager) {
        super(em, ConversationActivityEntity);
    }

    async insertForReply(
        conversationId: string,
        activities: IReplyActivity[]
    ): Promise<void> {
        await this.em.insertMany(
            ConversationActivityEntity,
            activities.map(({ kind, label, count, sources, tool, at }) => ({
                conversationId,
                kind,
                label,
                payload:
                    count !== undefined || sources?.length || tool
                        ? { count, sources, tool }
                        : undefined,
                createdAt: at,
            }))
        );
    }

    /** Activities of one conversation, optionally within the visible page. */
    async findByConversation(
        conversationId: string,
        range?: { from?: Date; to?: Date }
    ): Promise<ConversationActivityEntity[]> {
        return this.find(
            {
                conversationId,
                ...((range?.from || range?.to) && {
                    createdAt: {
                        ...(range.from && { $gte: range.from }),
                        ...(range.to && { $lte: range.to }),
                    },
                }),
            },
            { orderBy: { createdAt: 'ASC' } }
        );
    }

    async deleteOlderThan(cutoff: Date): Promise<number> {
        return this.nativeDelete({ createdAt: { $lt: cutoff } });
    }
}
