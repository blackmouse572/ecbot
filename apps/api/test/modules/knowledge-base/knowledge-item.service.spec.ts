import type { EntityManager } from '@mikro-orm/postgresql';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '@app/modules/knowledge-base/enums/knowledge-base-item-status.enum';
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
        undefined as unknown as Ctor[6]
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
