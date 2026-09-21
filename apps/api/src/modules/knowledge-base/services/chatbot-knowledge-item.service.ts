import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSoftDeleteOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ChatbotEntity } from 'src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotKnowledgeItemEntity } from '../repository/entities/chatbot-knowledge-item.entity';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { ChatbotKnowledgeItemRepository } from '../repository/repositories/chatbot-knowledge-item.repository';
import { ChatbotKnowledgeItemResponseDto } from '../dtos/response/chatbot-knowledge-item.response.dto';
import { RagSyncService } from './rag-sync.service';

@Injectable()
export class ChatbotKnowledgeItemService {
    constructor(
        private readonly em: EntityManager,
        private readonly chatbotKnowledgeItemRepository: ChatbotKnowledgeItemRepository,
        private readonly ragSyncService: RagSyncService
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
                // Notify apps/ai of updated chatbot associations (best-effort).
                const restoredLinks =
                    await this.findByKnowledgeItem(knowledgeItemId);
                const restoredChatbotIds = restoredLinks.map(l => l.chatbot.id);
                void this.ragSyncService.updateChatbotLinks(
                    knowledgeItemId,
                    restoredChatbotIds
                );
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

        // Notify apps/ai of updated chatbot associations (best-effort).
        const links = await this.findByKnowledgeItem(knowledgeItemId);
        const chatbotIds = links.map(l => l.chatbot.id);
        void this.ragSyncService.updateChatbotLinks(
            knowledgeItemId,
            chatbotIds
        );

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

            // Notify apps/ai of updated chatbot associations (best-effort).
            const remainingLinks =
                await this.findByKnowledgeItem(knowledgeItemId);
            const remainingChatbotIds = remainingLinks.map(l => l.chatbot.id);
            void this.ragSyncService.updateChatbotLinks(
                knowledgeItemId,
                remainingChatbotIds
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
