import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSoftDeleteOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotKnowledgeItemEntity } from '../repository/entities/chatbot-knowledge-item.entity';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { ChatbotKnowledgeItemRepository } from '../repository/repositories/chatbot-knowledge-item.repository';
import { ChatbotKnowledgeItemResponseDto } from '../dtos/response/chatbot-knowledge-item.response.dto';
import { RagSyncService } from './rag-sync.service';
import { KnowledgeFailureNotifierService } from './knowledge-failure-notifier.service';
import { ENUM_KNOWLEDGE_FAILURE_KIND } from '../constants/knowledge-ingest.constant';

@Injectable()
export class ChatbotKnowledgeItemService {
    private readonly logger = new Logger(ChatbotKnowledgeItemService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly chatbotKnowledgeItemRepository: ChatbotKnowledgeItemRepository,
        private readonly ragSyncService: RagSyncService,
        private readonly failureNotifier: KnowledgeFailureNotifierService
    ) {}

    async findByChatbot(
        chatbotId: string,
        find?: FilterQuery<ChatbotKnowledgeItemEntity>,
        options?: IDatabaseFindAllOptions
    ): Promise<ChatbotKnowledgeItemEntity[]> {
        return this.chatbotKnowledgeItemRepository.find(
            {
                chatbot: chatbotId,
                isActive: true,
                deletedAt: null,
                ...(find as object),
            },
            {
                populate: ['knowledgeItem', 'knowledgeItem.tags'],
                orderBy: { priority: 'DESC', createdAt: 'DESC' },
                ...options,
            }
        );
    }

    /**
     * Returns all active (non-deleted) ChatbotKnowledgeItem links for a given
     * knowledge item. Populates the `chatbot` relation so callers can read each
     * link's chatbot id.  Used by the RAG ingest processor and Task 12.
     */
    async findByKnowledgeItem(
        knowledgeItemId: string,
        find?: FilterQuery<ChatbotKnowledgeItemEntity>,
        options?: IDatabaseFindAllOptions
    ): Promise<ChatbotKnowledgeItemEntity[]> {
        return this.chatbotKnowledgeItemRepository.find(
            {
                knowledgeItem: knowledgeItemId,
                isActive: true,
                deletedAt: null,
                ...(find as object),
            },
            {
                populate: ['chatbot'],
                orderBy: { priority: 'DESC', createdAt: 'DESC' },
                ...options,
            }
        );
    }

    async getTotalByChatbot(
        chatbotId: string,
        find?: FilterQuery<ChatbotKnowledgeItemEntity>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.chatbotKnowledgeItemRepository.getTotal(
            {
                chatbot: chatbotId,
                isActive: true,
                deletedAt: null,
                ...(find as object),
            },
            options
        );
    }

    async findOne(
        chatbotId: string,
        knowledgeItemId: string
    ): Promise<ChatbotKnowledgeItemEntity | null> {
        return this.chatbotKnowledgeItemRepository.findOne(
            {
                chatbot: chatbotId,
                knowledgeItem: knowledgeItemId,
                isActive: true,
                deletedAt: null,
            },
            { populate: ['knowledgeItem', 'knowledgeItem.tags'] }
        );
    }

    async linkItem(
        chatbotId: string,
        knowledgeItemId: string,
        options?: IDatabaseCreateOptions
    ): Promise<ChatbotKnowledgeItemEntity> {
        const em = options?.em || this.em;

        // Check if already linked
        const existing = await em
            .getRepository(ChatbotKnowledgeItemEntity)
            .findOne({
                chatbot: chatbotId,
                knowledgeItem: knowledgeItemId,
                deletedAt: null,
            });

        if (existing) {
            // If soft-deleted, restore it
            if (existing.deletedAt) {
                existing.deletedAt = null;
                existing.isActive = true;
                if (options?.actionBy) {
                    existing.updatedBy = em.getReference(
                        'UserEntity',
                        options.actionBy
                    );
                }
                await em.persistAndFlush(existing);
                return existing;
            }
            throw new ConflictException(
                'Knowledge item is already linked to this chatbot'
            );
        }

        // Create new link
        const link = em.create(ChatbotKnowledgeItemEntity, {
            chatbot: em.getReference(ChatbotEntity, chatbotId),
            knowledgeItem: em.getReference(
                KnowledgeItemEntity,
                knowledgeItemId
            ),
            isActive: true,
            priority: 0,
        });

        if (options?.actionBy) {
            link.createdBy = em.getReference('UserEntity', options.actionBy);
        }

        await em.persistAndFlush(link);

        return link;
    }

    async unlinkItem(
        chatbotId: string,
        knowledgeItemId: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        const em = options?.em || this.em;

        const link = await em
            .getRepository(ChatbotKnowledgeItemEntity)
            .findOne({
                chatbot: chatbotId,
                knowledgeItem: knowledgeItemId,
                deletedAt: null,
            });

        if (link) {
            link.deletedAt = new Date();
            if (options?.actionBy) {
                link.deletedBy = em.getReference(
                    'UserEntity',
                    options.actionBy
                );
            }
            await em.persistAndFlush(link);
        }
    }

    /**
     * Tell apps/ai which chatbots the item now belongs to. Call it after the
     * link change is committed: it reads the committed links, so the vector
     * store never gets chatbot_ids from an uncommitted or rolled-back change
     * (#118). Never throws; if the sync cannot be queued the owner is
     * notified, since the chatbot would otherwise silently miss the item.
     */
    async syncChatbotLinks(knowledgeItemId: string): Promise<void> {
        try {
            const links = await this.findByKnowledgeItem(knowledgeItemId);
            await this.ragSyncService.updateChatbotLinks(
                knowledgeItemId,
                links.map(l => l.chatbot.id)
            );
        } catch (err: unknown) {
            this.logger.error(
                `link sync failed item=${knowledgeItemId}: ${String(err)}`
            );
            await this.failureNotifier.notifyFailed(
                knowledgeItemId,
                ENUM_KNOWLEDGE_FAILURE_KIND.LINK_SYNC
            );
        }
    }

    mapGet(data: ChatbotKnowledgeItemEntity): ChatbotKnowledgeItemResponseDto {
        return plainToInstance(
            ChatbotKnowledgeItemResponseDto,
            {
                ...data,
                knowledgeItemId: data.knowledgeItem?.id,
                chatbotId: data.chatbot?.id,
            },
            {
                excludeExtraneousValues: true,
            }
        );
    }

    mapList(
        data: ChatbotKnowledgeItemEntity[]
    ): ChatbotKnowledgeItemResponseDto[] {
        return data.map(item => this.mapGet(item));
    }
}
