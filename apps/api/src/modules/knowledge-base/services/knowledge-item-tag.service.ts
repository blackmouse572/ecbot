import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { KnowledgeItemTagEntity } from '../repository/entities/knowledge-item-tag.entity';
import { KnowledgeItemTagRepository } from '../repository/repositories/knowledge-item-tag.repository';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';

@Injectable()
export class KnowledgeItemTagService {
    constructor(
        private readonly em: EntityManager,
        private readonly tagRepository: KnowledgeItemTagRepository
    ) {}

    async find(
        find?: FilterQuery<KnowledgeItemTagEntity>,
        options?: IDatabaseFindAllOptions
    ): Promise<KnowledgeItemTagEntity[]> {
        return this.tagRepository.find(find, options);
    }

    async findUniqueTagsByKnowledgeBase(itemId: string): Promise<string[]> {
        return this.tagRepository.findUniqueTagsByKnowledgeBase(itemId);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.tagRepository.getTotal(find, options);
    }

    async findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<KnowledgeItemTagEntity | null> {
        return this.tagRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<KnowledgeItemTagEntity | null> {
        return this.tagRepository.findOne(find, options);
    }

    async create(
        payload: {
            knowledgeItem: string;
            tag: string;
        },
        options?: IDatabaseCreateOptions
    ): Promise<KnowledgeItemTagEntity> {
        const em = options?.em ?? this.em;

        const itemTag = new KnowledgeItemTagEntity();
        itemTag.knowledgeItem = em.getReference(
            KnowledgeItemEntity,
            payload.knowledgeItem
        );
        itemTag.tag = payload.tag;

        await em.persist(itemTag).flush();

        return itemTag;
    }

    /**
     * Find existing tag or create if doesn't exist
     * Prevents duplicate tag entries for the same item
     */
    async findOneOrCreate(
        payload: {
            knowledgeItem: string;
            tag: string;
        },
        options?: IDatabaseCreateOptions
    ): Promise<KnowledgeItemTagEntity> {
        const em = options?.em ?? this.em;

        // Check if this tag already exists for this item
        const existingTag = await this.tagRepository.findOne({
            knowledgeItem: payload.knowledgeItem,
            tag: payload.tag,
            deletedAt: null,
        });

        if (existingTag) {
            return existingTag;
        }

        // Create new tag if it doesn't exist
        const itemTag = new KnowledgeItemTagEntity();
        itemTag.knowledgeItem = em.getReference(
            KnowledgeItemEntity,
            payload.knowledgeItem
        );
        itemTag.tag = payload.tag;

        await em.persist(itemTag).flush();

        return itemTag;
    }

    async softDelete(
        id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<KnowledgeItemTagEntity> {
        const em = options?.em ?? this.em;

        const itemTag = await em.findOneOrFail(KnowledgeItemTagEntity, id);

        itemTag.deletedAt = new Date();

        await em.persist(itemTag).flush();

        return itemTag;
    }

    /**
     * Soft delete all tags with specific tag string in a knowledge base
     */
    async softDeleteByTag(
        knowledgeBaseId: string,
        tagString: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        const em = options?.em ?? this.em;

        const tags = await this.tagRepository.find({
            knowledgeItem: {
                knowledgeBase: knowledgeBaseId,
            },
            tag: tagString,
            deletedAt: null,
        });

        const now = new Date();
        for (const tag of tags) {
            tag.deletedAt = now;
            tag.deletedBy = options?.actionBy
                ? em.getReference('UserEntity', options.actionBy)
                : undefined;
        }

        await em.persist(tags).flush();
    }

    mapList(data: KnowledgeItemTagEntity[]): Record<string, any>[] {
        return plainToInstance(KnowledgeItemTagEntity, data, {
            excludeExtraneousValues: true,
        }) as Record<string, any>[];
    }

    mapGet(data: KnowledgeItemTagEntity): Record<string, any> {
        return plainToInstance(KnowledgeItemTagEntity, data, {
            excludeExtraneousValues: true,
        }) as Record<string, any>;
    }
}
