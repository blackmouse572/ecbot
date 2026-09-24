import { NotFoundException } from '@nestjs/common';
import { KnowledgeBaseEntity } from '@app/modules/knowledge-base/repository/entities/knowledge-base.entity';
import { KnowledgeBaseService } from '@app/modules/knowledge-base/services/knowledge-base.service';

describe('KnowledgeBaseService', () => {
    // Regression: `update`/`softDelete` must scope the lookup to the
    // caller's workspace — otherwise a knowledge base id from another
    // workspace can be updated or deleted.
    describe('update', () => {
        it('scopes the lookup to the given workspace', async () => {
            const knowledgeBase = { id: 'kb-1' } as KnowledgeBaseEntity;
            const findOne = jest.fn().mockResolvedValue(knowledgeBase);
            const flush = jest.fn().mockResolvedValue(undefined);
            const em = {
                findOne,
                persist: jest.fn().mockReturnValue({ flush }),
            };
            const service = new KnowledgeBaseService(em as any, {} as any);

            await service.update('kb-1', 'workspace-1', { name: 'New name' });

            expect(findOne).toHaveBeenCalledWith(KnowledgeBaseEntity, {
                id: 'kb-1',
                workspace: 'workspace-1',
            });
        });

        // Regression: a missing or cross-workspace id must 404, not 500 —
        // em.findOneOrFail threw MikroORM's own NotFoundError, which the
        // controller's `instanceof NotFoundException` check never caught.
        it('throws NotFoundException with the knowledgeBase.error.notFound message when nothing matches', async () => {
            const em = {
                findOne: jest.fn().mockResolvedValue(null),
                persist: jest.fn(),
            };
            const service = new KnowledgeBaseService(em as any, {} as any);

            await expect(
                service.update('kb-other', 'workspace-1', { name: 'x' })
            ).rejects.toMatchObject({
                constructor: NotFoundException,
                response: expect.objectContaining({
                    message: 'knowledgeBase.error.notFound',
                }),
            });
            expect(em.persist).not.toHaveBeenCalled();
        });
    });

    describe('softDelete', () => {
        it('scopes the lookup to the given workspace', async () => {
            const knowledgeBase = { id: 'kb-1' } as KnowledgeBaseEntity;
            const findOne = jest.fn().mockResolvedValue(knowledgeBase);
            const em = {
                findOne,
                persistAndFlush: jest.fn().mockResolvedValue(undefined),
                getReference: jest.fn(),
            };
            const service = new KnowledgeBaseService(em as any, {} as any);

            await service.softDelete('kb-1', 'workspace-1');

            expect(findOne).toHaveBeenCalledWith(KnowledgeBaseEntity, {
                id: 'kb-1',
                workspace: 'workspace-1',
            });
        });

        it('throws NotFoundException with the knowledgeBase.error.notFound message when nothing matches', async () => {
            const em = {
                findOne: jest.fn().mockResolvedValue(null),
                persistAndFlush: jest.fn(),
            };
            const service = new KnowledgeBaseService(em as any, {} as any);

            await expect(
                service.softDelete('kb-other', 'workspace-1')
            ).rejects.toMatchObject({
                constructor: NotFoundException,
                response: expect.objectContaining({
                    message: 'knowledgeBase.error.notFound',
                }),
            });
            expect(em.persistAndFlush).not.toHaveBeenCalled();
        });
    });
});
