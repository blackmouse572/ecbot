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

    /**
     * Knowledge storage the workspace uses across its live knowledge bases:
     * a file or media item counts its file's bytes, a text item its text, and
     * a website item the text read from its pages. Text counts one byte per
     * character, so an owner can predict it from what they typed.
     */
    async getStorageUsageByWorkspace(workspaceId: string): Promise<number> {
        const [row] = await this.em
            .getConnection()
            .execute<{ total: string | number }[]>(
                `select coalesce(sum(case
                    when i.attachment_size is not null then i.attachment_size
                    when i.type = ? then coalesce(page.chars, 0)
                    else coalesce(char_length(i.content), 0)
                end), 0) as total
            from knowledge_base_items i
            join knowledge_bases kb on kb.id = i.knowledge_base_id
            left join lateral (
                select sum(d.content_chars) as chars
                from rag.rag_documents d
                where i.type = ?
                    and d.metadata->>'knowledge_item_id' = i.id::text
            ) page on true
            where kb.workspace_id = ?
                and kb.deleted_at is null
                and i.deleted_at is null`,
                [
                    ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL,
                    ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL,
                    workspaceId,
                ]
            );
        return Number(row?.total ?? 0);
    }

    /** Chunk count per item, in one query for a whole page of items. */
    async countChunks(itemIds: string[]): Promise<Map<string, number>> {
        if (itemIds.length === 0) return new Map();

        const rows: { id: string; chunk_count: string }[] = await this.em
            .getConnection()
            .execute(
                `
                SELECT knowledge_base_item_id AS id, COUNT(*) AS chunk_count
                FROM knowledge_item_chunks
                WHERE knowledge_base_item_id IN (?)
                GROUP BY knowledge_base_item_id
                `,
                [itemIds]
            );

        return new Map(rows.map(row => [row.id, Number(row.chunk_count)]));
    }
}
