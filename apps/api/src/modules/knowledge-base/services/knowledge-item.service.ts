import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import {
    EntityManager,
    FilterQuery,
    FindAllOptions,
} from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AwsS3Entity } from '@app/modules/aws/repository/entities/aws.s3.entity';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { KnowledgeItemTagEntity } from '../repository/entities/knowledge-item-tag.entity';
import { KnowledgeItemRepository } from '../repository/repositories/knowledge-item.repository';
import { KnowledgeItemTagRepository } from '../repository/repositories/knowledge-item-tag.repository';
import { KnowledgeItemFolderRepository } from '../repository/repositories/knowledge-item-folder.repository';
import { KnowledgeItemResponseDto } from '../dtos/response/knowledge-item.response.dto';
import { KnowledgeItemFolderEntity } from '../repository/entities/knowledge-item-folder.entity';
import { KnowledgeBaseEntity } from '../repository/entities/knowledge-base.entity';
import { KnowledgeItemTagService } from './knowledge-item-tag.service';
import { KnowledgeItemShortResponseDto } from '../dtos/response/knowledge-item-short.response.dto';
import { KnowledgeIngestService } from './knowledge-ingest.service';
import { RagSyncService } from './rag-sync.service';

@Injectable()
export class KnowledgeItemService {
    constructor(
        private readonly em: EntityManager,
        private readonly knowledgeItemRepository: KnowledgeItemRepository,
        private readonly knowledgeItemTagRepository: KnowledgeItemTagRepository,
        private readonly knowledgeItemFolderRepository: KnowledgeItemFolderRepository,
        private readonly knowledgeItemTagService: KnowledgeItemTagService,
        private readonly knowledgeIngestService: KnowledgeIngestService,
        private readonly ragSyncService: RagSyncService
    ) {}

    async find(
        find?: FilterQuery<KnowledgeItemEntity>,
        options?: IDatabaseFindAllOptions
    ): Promise<KnowledgeItemEntity[]> {
        return this.knowledgeItemRepository.find(find, options);
    }

    async findByKnowledgeBase(kbId: string): Promise<KnowledgeItemEntity[]> {
        return this.knowledgeItemRepository.findByKnowledgeBase(kbId);
    }

    async findByType(
        kbId: string,
        type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE
    ): Promise<KnowledgeItemEntity[]> {
        return this.knowledgeItemRepository.findByKnowledgeBaseAndType(
            kbId,
            type
        );
    }

    async findByStatus(
        kbId: string,
        status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS
    ): Promise<KnowledgeItemEntity[]> {
        return this.knowledgeItemRepository.findByKnowledgeBaseAndStatus(
            kbId,
            status
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.knowledgeItemRepository.getTotal(find, options);
    }

    async findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<KnowledgeItemEntity | null> {
        return this.knowledgeItemRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<KnowledgeItemEntity | null> {
        return this.knowledgeItemRepository.findOne(find, options);
    }

    async create(
        payload: {
            knowledgeBase: string;
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE;
            title: string;
            content?: string;
            folder?: KnowledgeItemFolderEntity;
            tags?: string[];
            metadata?: Record<string, any>;
            attachment?: AwsS3Entity;
            workspace?: string;
        },
        options?: IDatabaseCreateOptions
    ): Promise<KnowledgeItemEntity> {
        const em = options?.em ?? this.em;

        return em.transactional(async transactionalEm => {
            const item = new KnowledgeItemEntity();
            item.knowledgeBase = transactionalEm.getReference(
                KnowledgeBaseEntity,
                payload.knowledgeBase
            );
            item.type = payload.type;
            item.title = payload.title;
            item.content = payload.content;
            item.folder = payload.folder
                ? transactionalEm.getReference(
                      KnowledgeItemFolderEntity,
                      payload.folder.id
                  )
                : undefined;
            item.metadata = payload.metadata;
            item.attachment = payload.attachment;
            item.status = ENUM_KNOWLEDGE_BASE_ITEM_STATUS.DRAFT;
            item.createdBy = options?.actionBy;

            await transactionalEm.persist(item).flush();

            // Add tags in batch if provided
            if (payload.tags && payload.tags.length > 0) {
                for (const tag of payload.tags) {
                    const tagEntity =
                        await this.knowledgeItemTagService.findOneOrCreate(
                            { knowledgeItem: item.id, tag },
                            { em: transactionalEm }
                        );
                    item.tags.add(tagEntity);
                }
                await transactionalEm.flush();
            }

            return item;
        });
    }

    async update(
        id: string,
        payload: {
            title?: string;
            content?: string;
            metadata?: Record<string, any>;
            status?: ENUM_KNOWLEDGE_BASE_ITEM_STATUS;
            errorMessage?: string | null;
            processedAt?: Date;
            tags?: string[];
        },
        options?: IDatabaseUpdateOptions
    ): Promise<KnowledgeItemEntity> {
        const em = options?.em ?? this.em;

        const item = await em.transactional(async transactionalEm => {
            const item = await transactionalEm.findOneOrFail(
                KnowledgeItemEntity,
                id
            );

            if (payload.title !== undefined) {
                item.title = payload.title;
            }
            if (payload.content !== undefined) {
                item.content = payload.content;
            }
            if (payload.metadata !== undefined) {
                item.metadata = payload.metadata;
            }
            if (payload.status !== undefined) {
                item.status = payload.status;
                // A non-FAILED status must never carry a stale failure message.
                if (
                    payload.status !== ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED &&
                    payload.errorMessage === undefined
                ) {
                    item.errorMessage = null;
                }
            }
            if (payload.errorMessage !== undefined) {
                item.errorMessage = payload.errorMessage;
            }
            if (payload.processedAt !== undefined) {
                item.processedAt = payload.processedAt;
            }

            item.updatedBy = options?.actionBy;
            item.updatedAt = new Date();

            await transactionalEm.persist(item).flush();

            // Handle tags if provided
            if (payload.tags !== undefined) {
                const existingTags =
                    await this.knowledgeItemTagRepository.findByKnowledgeItem(
                        id
                    );
                existingTags.forEach(tag => transactionalEm.remove(tag));
                await transactionalEm.flush();

                for (const tag of payload.tags) {
                    const tagEntity =
                        await this.knowledgeItemTagService.findOneOrCreate(
                            { knowledgeItem: id, tag },
                            { em: transactionalEm }
                        );
                    item.tags.add(tagEntity);
                }
                await transactionalEm.flush();
            }

            return item;
        });

        if (payload.status === ENUM_KNOWLEDGE_BASE_ITEM_STATUS.READY) {
            await this.knowledgeIngestService.enqueue(item.id);
        }

        return item;
    }

    /**
     * Lightweight status updater used by the RAG ingest processor.
     * Directly persists the entity without triggering side-effects
     * (e.g. the re-enqueue that `update` performs on READY status).
     */
    async updateStatus(
        id: string,
        payload: {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS;
            errorMessage?: string | null;
            processedAt?: Date;
            metadata?: Record<string, any>;
        }
    ): Promise<void> {
        const item = await this.em.findOneOrFail(KnowledgeItemEntity, id);
        item.status = payload.status;
        if (payload.errorMessage !== undefined) {
            item.errorMessage = payload.errorMessage;
        } else if (payload.status !== ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED) {
            // Non-FAILED statuses must never carry a stale failure message.
            item.errorMessage = null;
        }
        if (payload.processedAt !== undefined)
            item.processedAt = payload.processedAt;
        if (payload.metadata !== undefined) item.metadata = payload.metadata;
        item.updatedAt = new Date();
        await this.em.persistAndFlush(item);
    }

    async softDelete(
        id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        const em = options?.em ?? this.em;

        const item = await em.findOneOrFail(KnowledgeItemEntity, id);

        item.deletedAt = new Date();
        item.deletedBy = options?.actionBy
            ? em.getReference('UserEntity', options.actionBy)
            : undefined;

        await em.persist(item).flush();

        // Notify apps/ai to remove RAG documents for this item (best-effort).
        void this.ragSyncService.deleteByItem(item.id);
    }

    async delete(id: string, options?: IDatabaseDeleteOptions): Promise<void> {
        await this.knowledgeItemRepository.delete({ id }, options);
    }

    async countByKnowledgeBase(kbId: string): Promise<number> {
        return this.knowledgeItemRepository.countByKnowledgeBase(kbId);
    }

    async getStorageUsageByKnowledgeBase(kbId: string): Promise<number> {
        return this.knowledgeItemRepository.getStorageUsageByKnowledgeBase(
            kbId
        );
    }

    mapGet(data: KnowledgeItemEntity): KnowledgeItemResponseDto {
        return plainToInstance(
            KnowledgeItemResponseDto,
            {
                ...data,
                tags: data.tagArray,
            },
            {
                excludeExtraneousValues: true,
            }
        );
    }

    mapShort(data: KnowledgeItemEntity): KnowledgeItemShortResponseDto {
        return plainToInstance(
            KnowledgeItemShortResponseDto,
            {
                ...data,
                tags: data.tagArray,
            },
            {
                excludeExtraneousValues: true,
            }
        );
    }

    mapList(data: KnowledgeItemEntity[]): KnowledgeItemResponseDto[] {
        return data.map(item => this.mapGet(item));
    }
}
