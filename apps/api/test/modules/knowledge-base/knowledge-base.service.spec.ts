import { KnowledgeBaseEntity } from '@app/modules/knowledge-base/repository/entities/knowledge-base.entity';
import { KnowledgeBaseService } from '@app/modules/knowledge-base/services/knowledge-base.service';

describe('KnowledgeBaseService', () => {
    // Regression: `update`/`softDelete` must scope the lookup to the
    // caller's workspace — otherwise a knowledge base id from another
    // workspace can be updated or deleted.
    describe('update', () => {
        it('scopes the lookup to the given workspace', async () => {
            const knowledgeBase = { id: 'kb-1' } as KnowledgeBaseEntity;
            const findOneOrFail = jest.fn().mockResolvedValue(knowledgeBase);
            const flush = jest.fn().mockResolvedValue(undefined);
            const em = {
                findOneOrFail,
                persist: jest.fn().mockReturnValue({ flush }),
            };
            const service = new KnowledgeBaseService(em as any, {} as any);

            await service.update('kb-1', 'workspace-1', { name: 'New name' });

            expect(findOneOrFail).toHaveBeenCalledWith(KnowledgeBaseEntity, {
                id: 'kb-1',
                workspace: 'workspace-1',
            });
        });
    });

    describe('softDelete', () => {
        it('scopes the lookup to the given workspace', async () => {
            const knowledgeBase = { id: 'kb-1' } as KnowledgeBaseEntity;
            const findOneOrFail = jest.fn().mockResolvedValue(knowledgeBase);
            const em = {
                findOneOrFail,
                persistAndFlush: jest.fn().mockResolvedValue(undefined),
                getReference: jest.fn(),
            };
            const service = new KnowledgeBaseService(em as any, {} as any);

            await service.softDelete('kb-1', 'workspace-1');

            expect(findOneOrFail).toHaveBeenCalledWith(KnowledgeBaseEntity, {
                id: 'kb-1',
                workspace: 'workspace-1',
            });
        });
    });
});
