import { NotFoundException } from '@nestjs/common';
import { WorkspaceAdminController } from 'src/modules/workspace/controllers/workspace.admin.controller';

describe('WorkspaceAdminController', () => {
    const workspaceAdminService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOneById: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(3) };
    const controller = new WorkspaceAdminController(
        workspaceAdminService as any,
        paginationService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists workspaces matching the search, paged', async () => {
        const rows = [{ id: 'w1' }];
        workspaceAdminService.findAll.mockResolvedValue(rows);
        workspaceAdminService.getTotal.mockResolvedValue(41);
        const search = { $or: [{ name: { $ilike: '%shop%' } }] };

        const result = await controller.list({
            _search: search,
            _limit: 20,
            _offset: 20,
            _order: { createdAt: 'desc' },
        } as any);

        expect(workspaceAdminService.findAll).toHaveBeenCalledWith(search, {
            limit: 20,
            offset: 20,
            order: { createdAt: 'desc' },
        });
        expect(workspaceAdminService.getTotal).toHaveBeenCalledWith(search);
        expect(result).toEqual({
            _pagination: { total: 41, totalPage: 3 },
            data: rows,
        });
    });

    it('returns one workspace', async () => {
        workspaceAdminService.findOneById.mockResolvedValue({ id: 'w1' });

        await expect(controller.get('w1')).resolves.toEqual({
            data: { id: 'w1' },
        });
    });

    it('answers 404 for an unknown workspace', async () => {
        workspaceAdminService.findOneById.mockResolvedValue(null);

        await expect(controller.get('nope')).rejects.toBeInstanceOf(
            NotFoundException
        );
    });
});
