import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { KnowledgeItemTagEntity } from '../entities/knowledge-item-tag.entity';

@Injectable()
export class KnowledgeItemTagRepository extends DatabaseRepository<KnowledgeItemTagEntity> {
    constructor(em: EntityManager) {
        super(em, KnowledgeItemTagEntity);
    }

    async findByKnowledgeItem(itemId: string) {
        return this.find(
            { knowledgeItem: itemId, deletedAt: null },
            {
                populate: ['knowledgeItem'],
                orderBy: { tag: 'ASC' },
            }
        );
    }

    async findByTag(tag: string) {
        return this.find(
            { tag, deletedAt: null },
            {
                populate: ['knowledgeItem'],
            }
        );
    }

    async findUniqueTagsByKnowledgeBase(kbId: string) {
        const tags = await this.find(
            {
                knowledgeItem: {
                    knowledgeBase: kbId,
                    deletedAt: null,
                },
                deletedAt: null,
            },
            { populate: ['knowledgeItem'] }
        );

        const uniqueTags = new Set(tags.map(t => t.tag));
        return Array.from(uniqueTags).sort();
    }

    async countByTag(tag: string) {
        return this.em.count(KnowledgeItemTagEntity, { tag, deletedAt: null });
    }
}
