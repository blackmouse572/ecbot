import {
    Inject,
    Injectable,
    Optional,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import { ENUM_KNOWLEDGE_BASE_STATUS_CODE_ERROR } from '../enums/knowledge-base.status-code.enum';
import {
    KB_STORAGE_LIMIT,
    KbStorageLimit,
} from '../interfaces/kb-storage-limit.interface';
import { KnowledgeItemRepository } from '../repository/repositories/knowledge-item.repository';

@Injectable()
export class KnowledgeStorageQuotaService {
    constructor(
        private readonly knowledgeItemRepository: KnowledgeItemRepository,
        @Optional()
        @Inject(KB_STORAGE_LIMIT)
        private readonly limit?: KbStorageLimit
    ) {}

    async assertCanStore(
        workspaceId: string,
        incomingBytes: number
    ): Promise<void> {
        const limitBytes = await this.limit?.getLimitBytes(workspaceId);
        if (limitBytes === undefined || limitBytes === null) {
            return;
        }

        const usedBytes =
            await this.knowledgeItemRepository.getStorageUsageByWorkspace(
                workspaceId
            );
        // A website item's size is known only once its pages are read, so it
        // is refused only when storage is already full.
        const full =
            incomingBytes === 0
                ? usedBytes >= limitBytes
                : usedBytes + incomingBytes > limitBytes;
        if (full) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_KNOWLEDGE_BASE_STATUS_CODE_ERROR.STORAGE_LIMIT_EXCEEDED,
                message: 'knowledgeItem.error.storageLimitExceeded',
                errors: { usedBytes, limitBytes },
            });
        }
    }

    /** True once the workspace stores more than its plan allows. */
    async isOverLimit(workspaceId: string): Promise<boolean> {
        const limitBytes = await this.limit?.getLimitBytes(workspaceId);
        if (limitBytes === undefined || limitBytes === null) return false;
        const usedBytes =
            await this.knowledgeItemRepository.getStorageUsageByWorkspace(
                workspaceId
            );
        return usedBytes > limitBytes;
    }

    /**
     * Checks a text or website item before it is saved. Text counts one byte
     * per character (as in the usage total); an edit counts only its growth.
     */
    async assertCanSaveContent(
        workspaceId: string,
        type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        content: string | undefined,
        previousContent?: string
    ): Promise<void> {
        if (type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL) {
            return this.assertCanStore(workspaceId, 0);
        }
        if (type !== ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT) return;

        // Code points, as Postgres char_length counts them (an emoji is one).
        const growth =
            [...(content ?? '')].length - [...(previousContent ?? '')].length;
        if (growth > 0) await this.assertCanStore(workspaceId, growth);
    }
}
