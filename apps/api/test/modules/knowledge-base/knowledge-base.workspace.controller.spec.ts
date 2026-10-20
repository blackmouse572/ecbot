import { NotFoundException } from '@nestjs/common';
import { KnowledgeBaseWorkspaceController } from '@app/modules/knowledge-base/controllers/knowledge-base.workspace.controller';

// Regression: a missing or cross-workspace knowledge base id must 404, not
// 500 — KnowledgeBaseService.update used to throw MikroORM's own
// NotFoundError, which this controller's `instanceof NotFoundException`
// check never caught.
describe('KnowledgeBaseWorkspaceController.update', () => {
    let controller: KnowledgeBaseWorkspaceController;
    let knowledgeBaseService: { update: jest.Mock };
    let em: { fork: jest.Mock };
    let session: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock };

    const user = { id: 'user-1' } as any;
    const workspace = { id: 'workspace-1' } as any;

    beforeEach(() => {
        knowledgeBaseService = { update: jest.fn() };
        session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        em = { fork: jest.fn(() => session) };

        controller = new KnowledgeBaseWorkspaceController(
            em as any,
            knowledgeBaseService as any,
            {} as any,
            { createByUser: jest.fn() } as any
        );
    });

    it('returns 404 with the knowledgeBase.error.notFound message for a missing or cross-workspace id', async () => {
        knowledgeBaseService.update.mockRejectedValue(
            new NotFoundException({
                statusCode: 5042,
                message: 'knowledgeBase.error.notFound',
            })
        );

        await expect(
            controller.update(user, workspace, 'kb-other', {
                name: 'x',
            } as any)
        ).rejects.toMatchObject({
            constructor: NotFoundException,
            response: expect.objectContaining({
                message: 'knowledgeBase.error.notFound',
            }),
        });
        expect(session.rollback).toHaveBeenCalled();
        expect(session.commit).not.toHaveBeenCalled();
    });
});

describe('KnowledgeBaseWorkspaceController, one knowledge base per workspace', () => {
    it('cannot create a knowledge base', () => {
        expect(KnowledgeBaseWorkspaceController.prototype).not.toHaveProperty(
            'create'
        );
    });

    it('does not return a deleted knowledge base', async () => {
        const knowledgeBaseService = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const controller = new KnowledgeBaseWorkspaceController(
            {} as any,
            knowledgeBaseService as any,
            {} as any,
            {} as any
        );

        await expect(
            controller.get(
                { id: 'user-1' } as any,
                { id: 'workspace-1' } as any,
                'kb-1'
            )
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(knowledgeBaseService.findOne).toHaveBeenCalledWith({
            id: 'kb-1',
            workspace: 'workspace-1',
            deletedAt: null,
        });
    });

    // The app opens the first listed knowledge base (newest first). A deleted
    // one left by the merge migration came first, and its items and tags 404,
    // so the Knowledge Base page showed "Page Not Found".
    it('does not list a deleted knowledge base', async () => {
        const knowledgeBaseService = {
            find: jest.fn().mockResolvedValue([]),
            getTotal: jest.fn().mockResolvedValue(0),
            mapList: jest.fn().mockReturnValue([]),
        };
        const controller = new KnowledgeBaseWorkspaceController(
            {} as any,
            knowledgeBaseService as any,
            { totalPage: jest.fn().mockReturnValue(0) } as any,
            {} as any
        );

        await controller.list(
            { id: 'workspace-1' } as any,
            {
                _search: {},
                _limit: 10,
                _offset: 0,
                _order: {},
            } as any
        );

        expect(knowledgeBaseService.find).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: 'workspace-1',
                deletedAt: null,
            }),
            expect.anything()
        );
    });
});
