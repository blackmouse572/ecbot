import { NotFoundException } from '@nestjs/common';
import { KnowledgeItemTagController } from '@app/modules/knowledge-base/controllers/knowledge-item-tag.workspace.controller';

describe('KnowledgeItemTagController', () => {
    let controller: KnowledgeItemTagController;
    let knowledgeBaseService: { findOne: jest.Mock };
    let tagService: {
        findUniqueTagsByKnowledgeBase: jest.Mock;
        softDeleteByTag: jest.Mock;
    };
    let em: { fork: jest.Mock };
    let activityService: { createByUser: jest.Mock };

    const workspace = { id: 'workspace-1' } as any;
    const user = { id: 'user-1' } as any;

    beforeEach(() => {
        knowledgeBaseService = { findOne: jest.fn() };
        tagService = {
            findUniqueTagsByKnowledgeBase: jest.fn().mockResolvedValue(['a']),
            softDeleteByTag: jest.fn().mockResolvedValue(undefined),
        };
        activityService = { createByUser: jest.fn() };
        em = {
            fork: jest.fn(() => ({
                begin: jest.fn(),
                commit: jest.fn(),
                rollback: jest.fn(),
            })),
        };

        controller = new KnowledgeItemTagController(
            em as any,
            tagService as any,
            knowledgeBaseService as any,
            activityService as any
        );
    });

    describe('list', () => {
        it('returns 404 when the knowledge base does not belong to the workspace', async () => {
            knowledgeBaseService.findOne.mockResolvedValue(null);

            await expect(
                controller.list(workspace, 'kb-other')
            ).rejects.toThrow(NotFoundException);
            expect(
                tagService.findUniqueTagsByKnowledgeBase
            ).not.toHaveBeenCalled();
        });

        it('returns the tags when the knowledge base belongs to the workspace', async () => {
            knowledgeBaseService.findOne.mockResolvedValue({ id: 'kb-1' });

            const result = await controller.list(workspace, 'kb-1');

            expect(result.data).toEqual(['a']);
        });
    });

    describe('delete', () => {
        it('returns 404 when the knowledge base does not belong to the workspace', async () => {
            knowledgeBaseService.findOne.mockResolvedValue(null);

            await expect(
                controller.delete(user, workspace, 'kb-other', 'tag-a')
            ).rejects.toThrow(NotFoundException);
            expect(tagService.softDeleteByTag).not.toHaveBeenCalled();
        });

        it('deletes the tag when the knowledge base belongs to the workspace', async () => {
            knowledgeBaseService.findOne.mockResolvedValue({ id: 'kb-1' });

            await controller.delete(user, workspace, 'kb-1', 'tag-a');

            expect(tagService.softDeleteByTag).toHaveBeenCalledWith(
                'kb-1',
                'tag-a',
                expect.objectContaining({ actionBy: 'user-1' })
            );
        });
    });
});
