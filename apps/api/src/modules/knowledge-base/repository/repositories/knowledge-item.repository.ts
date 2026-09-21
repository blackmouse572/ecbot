import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';
import { KnowledgeItemEntity } from '../entities/knowledge-item.entity';

@Injectable()
export class KnowledgeItemRepository extends DatabaseRepository<KnowledgeItemEntity> {
    constructor(em: EntityManager) {
        super(em, KnowledgeItemEntity);
    }

    async findByKnowledgeBase(kbId: string) {
        return this.find(
            { knowledgeBase: kbId, deletedAt: null },
            {
                populate: ['knowledgeBase', 'folder', 'tags'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByKnowledgeBaseAndType(
        kbId: string,
        type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE
    ) {
        return this.find(
            { knowledgeBase: kbId, type, deletedAt: null },
            {
                populate: ['knowledgeBase', 'folder', 'tags'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByKnowledgeBaseAndStatus(
        kbId: string,
        status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS
    ) {
        return this.find(
            { knowledgeBase: kbId, status, deletedAt: null },
            {
                populate: ['knowledgeBase', 'folder', 'tags'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByFolder(folderId: string) {
        return this.find(
            { folder: folderId, deletedAt: null },
            {
                populate: ['knowledgeBase', 'folder', 'tags'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async countByKnowledgeBase(kbId: string) {
        return this.getTotal({ knowledgeBase: kbId, deletedAt: null });
    }

    async getStorageUsageByKnowledgeBase(kbId: string): Promise<number> {
        const items = await this.find(
            { knowledgeBase: kbId, deletedAt: null },
            { populate: ['attachment'] }
        );
        return items.reduce((total, item) => {
            if (item.attachment?.size) {
                return total + item.attachment.size;
            }
            return total;
        }, 0);
    }
}
