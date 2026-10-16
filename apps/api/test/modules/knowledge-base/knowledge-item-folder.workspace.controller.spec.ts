import { NotFoundException } from '@nestjs/common';
import { KnowledgeItemFolderController } from '@app/modules/knowledge-base/controllers/knowledge-item-folder.workspace.controller';

// A deleted folder must 404 from its old link, not load or delete again.
describe('KnowledgeItemFolderController, deleted folders', () => {
    const workspace = { id: 'ws-1' } as any;
    let folderService: { findOne: jest.Mock; softDelete: jest.Mock };
    let controller: KnowledgeItemFolderController;

    beforeEach(() => {
        folderService = {
            findOne: jest.fn().mockResolvedValue(null),
            softDelete: jest.fn(),
        };
        controller = new KnowledgeItemFolderController(
            {} as any,
            folderService as any,
            {} as any,
            {} as any,
            {} as any
        );
    });

    const deletedFolderLookup = {
        id: 'folder-1',
        workspace: 'ws-1',
        knowledgeBase: 'kb-1',
        deletedAt: null,
    };

    it('get skips deleted folders', async () => {
        await expect(
            controller.get(workspace, 'kb-1', 'folder-1')
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(folderService.findOne).toHaveBeenCalledWith(deletedFolderLookup);
    });

    it('delete skips deleted folders', async () => {
        await expect(
            controller.delete(
                { id: 'user-1' } as any,
                workspace,
                'kb-1',
                'folder-1'
            )
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(folderService.findOne).toHaveBeenCalledWith(deletedFolderLookup);
        expect(folderService.softDelete).not.toHaveBeenCalled();
    });
});
