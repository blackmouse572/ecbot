import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { KnowledgeItemAdminGetResponseDto } from '../dtos/response/knowledge-item.admin-get.response.dto';
import { KnowledgeItemAdminListResponseDto } from '../dtos/response/knowledge-item.admin-list.response.dto';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { ChatbotKnowledgeItemRepository } from '../repository/repositories/chatbot-knowledge-item.repository';
import { KnowledgeItemRepository } from '../repository/repositories/knowledge-item.repository';

/** Read side of the admin knowledge pages: every item, any workspace. */
@Injectable()
export class KnowledgeItemAdminService {
    constructor(
        private readonly knowledgeItemRepository: KnowledgeItemRepository,
        private readonly chatbotKnowledgeItemRepository: ChatbotKnowledgeItemRepository
    ) {}

    async findAll(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<KnowledgeItemAdminListResponseDto[]> {
        const items = await this.knowledgeItemRepository.find(
            this.where(find),
            { ...options, populate: ['knowledgeBase.workspace'] }
        );
        const chunkCounts = await this.knowledgeItemRepository.countChunks(
            items.map(item => item.id)
        );
        return items.map(item =>
            plainToInstance(
                KnowledgeItemAdminListResponseDto,
                this.toPlain(item, chunkCounts.get(item.id) ?? 0),
                { excludeExtraneousValues: true }
            )
        );
    }

    getTotal(find: Record<string, any>): Promise<number> {
        return this.knowledgeItemRepository.getTotal(this.where(find));
    }

    async findOneById(
        id: string
    ): Promise<KnowledgeItemAdminGetResponseDto | null> {
        const item = await this.findEntityById(id);
        if (!item) return null;

        const [chunkCounts, links] = await Promise.all([
            this.knowledgeItemRepository.countChunks([item.id]),
            this.chatbotKnowledgeItemRepository.findByKnowledgeItem(item.id),
        ]);
        const isUrl = item.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL;

        return plainToInstance(
            KnowledgeItemAdminGetResponseDto,
            {
                ...this.toPlain(item, chunkCounts.get(item.id) ?? 0),
                sourceUrl:
                    item.metadata?.url ??
                    (isUrl ? item.content : item.metadata?.sourceLink),
                fileName: item.metadata?.fileName,
                mimeType: item.attachment?.mime ?? item.metadata?.mimeType,
                errorMessage: item.errorMessage ?? undefined,
                processedAt: item.processedAt,
                chatbots: links
                    .map(link => link.chatbot)
                    .filter(chatbot => !chatbot.deletedAt),
            },
            { excludeExtraneousValues: true }
        );
    }

    /** The item with its workspace and owner, for the admin write routes. */
    findEntityById(id: string): Promise<KnowledgeItemEntity | null> {
        return this.knowledgeItemRepository.findOne(
            { id, deletedAt: null },
            { populate: ['knowledgeBase.workspace.owner'] }
        );
    }

    // `chatbot` is not a column of the item: it matches live links instead.
    private where(find: Record<string, any>): FilterQuery<KnowledgeItemEntity> {
        const { chatbot, ...rest } = find;
        return {
            deletedAt: null,
            ...rest,
            ...(chatbot && {
                chatbotLinks: { chatbot, isActive: true, deletedAt: null },
            }),
        };
    }

    private toPlain(
        item: KnowledgeItemEntity,
        chunkCount: number
    ): Record<string, unknown> {
        return {
            id: item.id,
            title: item.title,
            type: item.type,
            status: item.status,
            size: item.attachment?.size,
            chunkCount,
            workspace: item.knowledgeBase.workspace,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }
}
