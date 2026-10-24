import { UnprocessableEntityException } from '@nestjs/common';
import { ENUM_KNOWLEDGE_BASE_STATUS_CODE_ERROR } from '@app/modules/knowledge-base/enums/knowledge-base.status-code.enum';
import { KnowledgeStorageQuotaService } from '@app/modules/knowledge-base/services/knowledge-storage-quota.service';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '@app/modules/knowledge-base/enums/knowledge-base-item-type.enum';

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

describe('KnowledgeStorageQuotaService.assertCanSaveContent', () => {
    const repository = { getStorageUsageByWorkspace: jest.fn() };
    const limit = { getLimitBytes: jest.fn() };
    const service = new KnowledgeStorageQuotaService(repository as any, limit);

    beforeEach(() => {
        jest.clearAllMocks();
        limit.getLimitBytes.mockResolvedValue(100);
    });

    it('counts a text item by its characters', async () => {
        repository.getStorageUsageByWorkspace.mockResolvedValue(95);

        await expect(
            service.assertCanSaveContent(
                'ws-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
                'Xin chào'
            )
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('counts only the growth when a text item is edited', async () => {
        repository.getStorageUsageByWorkspace.mockResolvedValue(98);

        await expect(
            service.assertCanSaveContent(
                'ws-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
                'abcdef',
                'abcd'
            )
        ).resolves.toBeUndefined();
    });

    it('lets a smaller edit through even over the limit', async () => {
        repository.getStorageUsageByWorkspace.mockResolvedValue(150);

        await expect(
            service.assertCanSaveContent(
                'ws-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
                'ab',
                'abcd'
            )
        ).resolves.toBeUndefined();
        expect(repository.getStorageUsageByWorkspace).not.toHaveBeenCalled();
    });

    it('refuses a new website once storage is full', async () => {
        repository.getStorageUsageByWorkspace.mockResolvedValue(100);

        await expect(
            service.assertCanSaveContent(
                'ws-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL,
                'https://shop.vn'
            )
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('allows a new website while there is room left', async () => {
        repository.getStorageUsageByWorkspace.mockResolvedValue(99);

        await expect(
            service.assertCanSaveContent(
                'ws-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL,
                'https://shop.vn'
            )
        ).resolves.toBeUndefined();
    });
});

describe('KnowledgeStorageQuotaService.isOverLimit', () => {
    const repository = { getStorageUsageByWorkspace: jest.fn() };
    const limit = { getLimitBytes: jest.fn() };
    const service = new KnowledgeStorageQuotaService(repository as any, limit);

    it('is false at the limit and true past it', async () => {
        limit.getLimitBytes.mockResolvedValue(100);
        repository.getStorageUsageByWorkspace.mockResolvedValueOnce(100);
        await expect(service.isOverLimit('ws-1')).resolves.toBe(false);
        repository.getStorageUsageByWorkspace.mockResolvedValueOnce(101);
        await expect(service.isOverLimit('ws-1')).resolves.toBe(true);
    });

    it('is never over without a limit', async () => {
        limit.getLimitBytes.mockResolvedValue(null);
        await expect(service.isOverLimit('ws-1')).resolves.toBe(false);
    });
});

describe('KnowledgeStorageQuotaService text size', () => {
    it('counts an emoji as one character, like Postgres char_length', async () => {
        const repository = {
            getStorageUsageByWorkspace: jest.fn().mockResolvedValue(98),
        };
        const limit = { getLimitBytes: jest.fn().mockResolvedValue(100) };
        const service = new KnowledgeStorageQuotaService(
            repository as any,
            limit
        );

        await expect(
            service.assertCanSaveContent(
                'ws-1',
                ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
                '😀😀'
            )
        ).resolves.toBeUndefined();
    });
});
