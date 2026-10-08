import { UnprocessableEntityException } from '@nestjs/common';
import { ENUM_KNOWLEDGE_BASE_STATUS_CODE_ERROR } from '@app/modules/knowledge-base/enums/knowledge-base.status-code.enum';
import { KnowledgeStorageQuotaService } from '@app/modules/knowledge-base/services/knowledge-storage-quota.service';

const GB = 1024 ** 3;

describe('KnowledgeStorageQuotaService.assertCanStore', () => {
    const repository = { getStorageUsageByWorkspace: jest.fn() };
    const limit = { getLimitBytes: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('allows anything when no plan provider is wired (public build)', async () => {
        const service = new KnowledgeStorageQuotaService(repository as any);

        await expect(
            service.assertCanStore('ws-1', 10 * GB)
        ).resolves.toBeUndefined();
        expect(repository.getStorageUsageByWorkspace).not.toHaveBeenCalled();
    });

    it('allows anything when the plan has no storage limit', async () => {
        const service = new KnowledgeStorageQuotaService(
            repository as any,
            limit
        );
        limit.getLimitBytes.mockResolvedValue(null);

        await expect(
            service.assertCanStore('ws-1', 10 * GB)
        ).resolves.toBeUndefined();
        expect(repository.getStorageUsageByWorkspace).not.toHaveBeenCalled();
    });

    it('allows an upload that fits in the plan limit', async () => {
        const service = new KnowledgeStorageQuotaService(
            repository as any,
            limit
        );
        limit.getLimitBytes.mockResolvedValue(2 * GB);
        repository.getStorageUsageByWorkspace.mockResolvedValue(GB);

        await expect(
            service.assertCanStore('ws-1', GB)
        ).resolves.toBeUndefined();
        expect(limit.getLimitBytes).toHaveBeenCalledWith('ws-1');
        expect(repository.getStorageUsageByWorkspace).toHaveBeenCalledWith(
            'ws-1'
        );
    });

    it('refuses an upload that would pass the plan limit (422)', async () => {
        const service = new KnowledgeStorageQuotaService(
            repository as any,
            limit
        );
        limit.getLimitBytes.mockResolvedValue(2 * GB);
        repository.getStorageUsageByWorkspace.mockResolvedValue(2 * GB - 10);

        const result = service.assertCanStore('ws-1', 11);

        await expect(result).rejects.toBeInstanceOf(
            UnprocessableEntityException
        );
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode:
                    ENUM_KNOWLEDGE_BASE_STATUS_CODE_ERROR.STORAGE_LIMIT_EXCEEDED,
                message: 'knowledgeItem.error.storageLimitExceeded',
            },
        });
    });
});
