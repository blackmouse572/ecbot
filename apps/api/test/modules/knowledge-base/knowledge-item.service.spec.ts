import { Logger } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '@app/modules/knowledge-base/enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '@app/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { KnowledgeItemService } from '@app/modules/knowledge-base/services/knowledge-item.service';

describe('KnowledgeItemService.updateStatus', () => {
    const findOneOrFail = jest.fn();
    const persistAndFlush = jest.fn().mockResolvedValue(undefined);
    // updateStatus only touches the EntityManager; the remaining
    // collaborators are never reached in these tests.
    const em = {
        findOneOrFail,
        persistAndFlush,
    } as unknown as EntityManager;
    type Ctor = ConstructorParameters<typeof KnowledgeItemService>;
    const service = new KnowledgeItemService(
        em,
        undefined as unknown as Ctor[1],
        undefined as unknown as Ctor[2],
        undefined as unknown as Ctor[3],
        undefined as unknown as Ctor[4],
        undefined as unknown as Ctor[5],
        undefined as unknown as Ctor[6],
        undefined as unknown as Ctor[7]
    );
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('clears a stale failure message when reprocessing starts (#440)', async () => {
        const item = {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'connect ECONNREFUSED 0.0.0.0:8000',
        };
        findOneOrFail.mockResolvedValue(item);

        await service.updateStatus('item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING,
        });

        expect(item.errorMessage).toBeNull();
        expect(persistAndFlush).toHaveBeenCalledWith(item);
    });

    it('clears a stale failure message on success (#440)', async () => {
        const item = {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'connect ECONNREFUSED 0.0.0.0:8000',
        };
        findOneOrFail.mockResolvedValue(item);

        await service.updateStatus('item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
        });

        expect(item.errorMessage).toBeNull();
    });

    it('keeps the failure message when marking FAILED', async () => {
        const item = {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING,
            errorMessage: null,
        };
        findOneOrFail.mockResolvedValue(item);

        await service.updateStatus('item-1', {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'AI unavailable',
        });

        expect(item.errorMessage).toBe('AI unavailable');
    });
});

describe('KnowledgeItemService.softDelete', () => {
    const item = { id: 'item-1' };
    const flush = jest.fn().mockResolvedValue(undefined);
    const em = {
        findOneOrFail: jest.fn().mockResolvedValue(item),
        getReference: jest.fn((_: string, id: string) => ({ id })),
        persist: jest.fn(() => ({ flush })),
    } as unknown as EntityManager;
    const ragSyncService = { deleteByItem: jest.fn() };
    type Ctor = ConstructorParameters<typeof KnowledgeItemService>;
    const service = new KnowledgeItemService(
        em,
        undefined as unknown as Ctor[1],
        undefined as unknown as Ctor[2],
        undefined as unknown as Ctor[3],
        undefined as unknown as Ctor[4],
        undefined as unknown as Ctor[5],
        ragSyncService as unknown as Ctor[6],
        undefined as unknown as Ctor[7]
    );

    // The RAG cleanup is best-effort and not awaited. Left unhandled, its
    // rejection (e.g. Cloud Tasks unreachable) exits the API process.
    it('deletes the item when the RAG cleanup cannot be queued, and logs it', async () => {
        const warn = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
        ragSyncService.deleteByItem.mockRejectedValue(
            new Error('Could not load the default credentials.')
        );

        await expect(
            service.softDelete('item-1', { actionBy: 'user-1' })
        ).resolves.toBeUndefined();
        await new Promise(resolve => setImmediate(resolve));

        expect(flush).toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('item-1'));
        warn.mockRestore();
    });
});

describe('KnowledgeItemService.addTags', () => {
    it('adds each tag through findOneOrCreate and leaves existing tags alone', async () => {
        const item = { id: 'item-1' } as any;
        const em = {
            findOneOrFail: jest.fn().mockResolvedValue(item),
            getReference: jest.fn(() => 'user-ref'),
            persist: jest.fn(() => ({ flush: jest.fn() })),
        } as unknown as EntityManager;
        const tagService = { findOneOrCreate: jest.fn() };
        type Ctor = ConstructorParameters<typeof KnowledgeItemService>;
        const service = new KnowledgeItemService(
            em,
            undefined as unknown as Ctor[1],
            undefined as unknown as Ctor[2],
            undefined as unknown as Ctor[3],
            tagService as unknown as Ctor[4],
            undefined as unknown as Ctor[5],
            undefined as unknown as Ctor[6],
            undefined as unknown as Ctor[7]
        );

        await service.addTags('item-1', ['FAQ', 'menu'], {
            em,
            actionBy: 'user-1',
        });

        expect(tagService.findOneOrCreate).toHaveBeenCalledTimes(2);
        expect(tagService.findOneOrCreate).toHaveBeenCalledWith(
            { knowledgeItem: 'item-1', tag: 'menu' },
            { em }
        );
        expect(item.updatedBy).toBe('user-ref');
    });
});

describe('KnowledgeItemService.resolveBatchTarget', () => {
    type Ctor = ConstructorParameters<typeof KnowledgeItemService>;
    const build = (items: { id: string }[]) => {
        const repository = { find: jest.fn().mockResolvedValue(items) };
        const service = new KnowledgeItemService(
            {} as any,
            repository as unknown as Ctor[1],
            undefined as unknown as Ctor[2],
            undefined as unknown as Ctor[3],
            undefined as unknown as Ctor[4],
            undefined as unknown as Ctor[5],
            undefined as unknown as Ctor[6],
            undefined as unknown as Ctor[7]
        );
        return { service, repository };
    };

    it('passes listed ids through untouched', async () => {
        const { service, repository } = build([]);

        await expect(
            service.resolveBatchTarget('w', { ids: ['a'] })
        ).resolves.toEqual({ ids: ['a'], truncated: false });
        expect(repository.find).not.toHaveBeenCalled();
    });

    it('looks the filter up inside the workspace and knowledge base', async () => {
        const { service, repository } = build([{ id: 'a' }, { id: 'b' }]);

        const result = await service.resolveBatchTarget('w', {
            knowledgeBaseId: 'kb',
            filter: { tags: ['menu'], search: 'pho' },
        });

        expect(result).toEqual({ ids: ['a', 'b'], truncated: false });
        const where = repository.find.mock.calls[0][0];
        expect(where.knowledgeBase).toEqual({ id: 'kb', workspace: 'w' });
        expect(where.tags).toEqual({ tag: { $in: ['menu'] } });
        expect(where.title).toBeDefined();
    });

    it('cuts the result at the cap and says it was truncated', async () => {
        const items = Array.from({ length: 2001 }, (_, i) => ({ id: `${i}` }));
        const { service } = build(items);

        const result = await service.resolveBatchTarget('w', {
            knowledgeBaseId: 'kb',
            filter: {},
        });

        expect(result.ids).toHaveLength(2000);
        expect(result.truncated).toBe(true);
    });

    it('rejects ids together with a filter, or a filter without a knowledge base', async () => {
        const { service } = build([]);

        await expect(
            service.resolveBatchTarget('w', {
                ids: ['a'],
                knowledgeBaseId: 'kb',
                filter: {},
            })
        ).rejects.toThrow();
        await expect(
            service.resolveBatchTarget('w', { filter: {} })
        ).rejects.toThrow();
    });
});

// Text and website items count toward the plan's knowledge storage, like
// files, so they are checked before they are saved.
describe('KnowledgeItemService storage limit', () => {
    const refusal = new Error('storage full');
    const storageQuota = { assertCanSaveContent: jest.fn() };
    const flush = jest.fn().mockResolvedValue(undefined);
    const tx = {
        getReference: jest.fn((_entity, id) => ({ id })),
        persist: jest.fn(() => ({ flush })),
        flush,
        findOneOrFail: jest.fn(),
    };
    const em = {
        transactional: jest.fn(callback => callback(tx)),
    } as unknown as EntityManager;
    type Ctor = ConstructorParameters<typeof KnowledgeItemService>;
    const service = new KnowledgeItemService(
        em,
        undefined as unknown as Ctor[1],
        undefined as unknown as Ctor[2],
        undefined as unknown as Ctor[3],
        undefined as unknown as Ctor[4],
        undefined as unknown as Ctor[5],
        undefined as unknown as Ctor[6],
        storageQuota as unknown as Ctor[7]
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('refuses a text item that would pass the limit, saving nothing', async () => {
        storageQuota.assertCanSaveContent.mockRejectedValue(refusal);

        await expect(
            service.create({
                knowledgeBase: 'kb-1',
                workspace: 'ws-1',
                type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
                title: 'Giờ mở cửa',
                content: '8h đến 22h',
            })
        ).rejects.toBe(refusal);
        expect(storageQuota.assertCanSaveContent).toHaveBeenCalledWith(
            'ws-1',
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
            '8h đến 22h'
        );
        expect(tx.persist).not.toHaveBeenCalled();
    });

    it('checks an edited text against the text it replaces', async () => {
        storageQuota.assertCanSaveContent.mockRejectedValue(refusal);
        tx.findOneOrFail.mockResolvedValue({
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
            content: 'old',
            knowledgeBase: { workspace: { id: 'ws-1' } },
        });

        await expect(
            service.update('item-1', { content: 'a much longer text' })
        ).rejects.toBe(refusal);
        expect(storageQuota.assertCanSaveContent).toHaveBeenCalledWith(
            'ws-1',
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
            'a much longer text',
            'old'
        );
        expect(tx.persist).not.toHaveBeenCalled();
    });

    it('does not check an edit that leaves the content alone', async () => {
        tx.findOneOrFail.mockResolvedValue({
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.TEXT,
            content: 'old',
            knowledgeBase: { workspace: { id: 'ws-1' } },
        });

        await service.update('item-1', { title: 'New title' });

        expect(storageQuota.assertCanSaveContent).not.toHaveBeenCalled();
    });
});
