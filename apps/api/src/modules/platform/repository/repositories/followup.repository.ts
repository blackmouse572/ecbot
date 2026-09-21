import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    ENUM_FOLLOWUP_STATUS,
    PENDING_FOLLOWUP_STATUSES,
} from '../../constants/followup.constant';
import {
    IFollowupCreate,
    IFollowupOutcome,
    IFollowupWorkspaceFilter,
} from '../../interfaces/followup.interface';
import { FollowupEntity } from '../entities/followup.entity';

@Injectable()
export class FollowupRepository extends DatabaseRepository<FollowupEntity> {
    constructor(em: EntityManager) {
        // No default populate: the audit columns are never read for followups.
        super(em, FollowupEntity, []);
    }

    async createScheduled(data: IFollowupCreate): Promise<FollowupEntity> {
        const followup = this.em.create(FollowupEntity, {
            chatbot: this.em.getReference(ChatbotEntity, data.chatbotId),
            conversation: this.em.getReference(
                ConversationEntity,
                data.conversationId
            ),
            prompt: data.prompt,
            reason: data.reason,
            triggerMessageId: data.triggerMessageId,
            status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
            scheduledAt: data.scheduledAt,
        });
        await this.em.persistAndFlush(followup);

        return followup;
    }

    async findById(id: string): Promise<FollowupEntity | null> {
        return this.findOne({ id, deletedAt: null });
    }

    /** Not delivered yet, so still cancellable and still re-firable. */
    async findPendingById(
        id: string,
        workspaceId?: string
    ): Promise<FollowupEntity | null> {
        return this.findOne({
            id,
            status: { $in: PENDING_FOLLOWUP_STATUSES },
            deletedAt: null,
            ...(workspaceId
                ? { chatbot: { workspace: workspaceId, deletedAt: null } }
                : {}),
        });
    }

    async findScheduledByConversation(
        conversationId: string
    ): Promise<FollowupEntity[]> {
        return this.find(
            {
                conversation: conversationId,
                status: ENUM_FOLLOWUP_STATUS.SCHEDULED,
                deletedAt: null,
            },
            { orderBy: { scheduledAt: 'ASC' } }
        );
    }

    /** Newest-first so the page reads as a log; returns the page and its total. */
    async findAllByWorkspace(
        workspaceId: string,
        filter: IFollowupWorkspaceFilter
    ): Promise<[FollowupEntity[], number]> {
        const where = this.buildWorkspaceQuery(workspaceId, filter);

        return Promise.all([
            this.find(where, {
                limit: filter.limit,
                offset: filter.offset,
                orderBy: { scheduledAt: 'DESC' },
                populate: ['chatbot', 'conversation'],
            }),
            this.getTotal(where),
        ]);
    }

    async applyOutcome(id: string, outcome: IFollowupOutcome): Promise<void> {
        await this.updateRaw(
            { id },
            {
                status: outcome.status,
                firedAt: new Date(),
                outcomeReason: outcome.outcomeReason ?? null,
            }
        );
    }

    async markCancelled(id: string): Promise<void> {
        await this.updateRaw(
            { id },
            {
                status: ENUM_FOLLOWUP_STATUS.CANCELLED,
                cancelledAt: new Date(),
            }
        );
    }

    async incrementAttempts(id: string, attempts: number): Promise<void> {
        await this.updateRaw({ id }, { attempts: attempts + 1 });
    }

    async deleteById(id: string): Promise<void> {
        await this.delete({ id });
    }

    private buildWorkspaceQuery(
        workspaceId: string,
        filter: IFollowupWorkspaceFilter
    ): FilterQuery<FollowupEntity> {
        const chatbot: FilterQuery<ChatbotEntity> = {
            workspace: workspaceId,
            deletedAt: null,
            ...(filter.chatbotId ? { id: filter.chatbotId } : {}),
        };

        const conversation: FilterQuery<ConversationEntity> = {
            ...(filter.conversationId ? { id: filter.conversationId } : {}),
            ...(filter.search
                ? { senderName: { $ilike: `%${filter.search}%` } }
                : {}),
        };

        return {
            chatbot,
            deletedAt: null,
            ...(filter.status ? { status: filter.status } : {}),
            ...(Object.keys(conversation).length ? { conversation } : {}),
        };
    }
}
