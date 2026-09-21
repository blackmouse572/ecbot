import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { KnowledgeItemFolderEntity } from '../entities/knowledge-item-folder.entity';

@Injectable()
export class KnowledgeItemFolderRepository extends DatabaseRepository<KnowledgeItemFolderEntity> {
    constructor(em: EntityManager) {
        super(em, KnowledgeItemFolderEntity);
    }

    async findByKnowledgeBase(kbId: string) {
        return this.find(
            { knowledgeBase: kbId, isActive: true, deletedAt: null },
            {
                populate: ['knowledgeBase', 'parentFolder'],
                orderBy: { name: 'ASC' },
            }
        );
    }

    async findRootFolders(kbId: string) {
        return this.find(
            {
                knowledgeBase: kbId,
                parentFolder: null,
                isActive: true,
                deletedAt: null,
            },
            {
                populate: ['knowledgeBase'],
                orderBy: { name: 'ASC' },
            }
        );
    }

    async findChildFolders(parentId: string) {
        return this.find(
            { parentFolder: parentId, isActive: true, deletedAt: null },
            {
                populate: ['knowledgeBase', 'parentFolder'],
                orderBy: { name: 'ASC' },
            }
        );
    }

    async findBySlug(kbId: string, slug: string) {
        return this.findOne(
            { knowledgeBase: kbId, slug, isActive: true, deletedAt: null },
            { populate: ['knowledgeBase', 'parentFolder'] }
        );
    }

    async findByKnowledgeBaseAndName(
        kbId: string,
        name: string,
        parentId?: string
    ) {
        return this.findOne(
            {
                knowledgeBase: kbId,
                name,
                parentFolder: parentId || null,
                deletedAt: null,
            },
            { populate: ['knowledgeBase', 'parentFolder'] }
        );
    }
}
