import {
    Inject,
    Injectable,
    Optional,
    UnprocessableEntityException,
} from '@nestjs/common';
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
        if (usedBytes + incomingBytes > limitBytes) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_KNOWLEDGE_BASE_STATUS_CODE_ERROR.STORAGE_LIMIT_EXCEEDED,
                message: 'knowledgeItem.error.storageLimitExceeded',
                errors: { usedBytes, limitBytes },
            });
        }
    }
}
