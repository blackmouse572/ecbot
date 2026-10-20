import { NotFoundException } from '@nestjs/common';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { WorkspaceAdminController } from 'src/modules/workspace/controllers/workspace.admin.controller';
import { ENUM_WORKSPACE_STATUS } from 'src/modules/workspace/enums/workspace.enum';

describe('WorkspaceAdminController', () => {
    const workspaceAdminService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOneById: jest.fn(),
        findEntityById: jest.fn(),
        updateStatus: jest.fn(),
    };
    const activityService = { createByAdminWithWorkspace: jest.fn() };
    const em = { transactional: jest.fn(async (work: () => any) => work()) };
    const paginationService = { totalPage: jest.fn().mockReturnValue(3) };
    const controller = new WorkspaceAdminController(
        workspaceAdminService as any,
        paginationService as any,
        activityService as any,
        em as any
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

    it('narrows the list by status and owner', async () => {
        workspaceAdminService.findAll.mockResolvedValue([]);
        workspaceAdminService.getTotal.mockResolvedValue(0);
        const search = { $or: [{ name: { $ilike: '%shop%' } }] };
        const status = { status: { $in: [ENUM_WORKSPACE_STATUS.SUSPENDED] } };
        const owner = { owner: { $or: [{ name: /lan/i }, { email: /lan/i }] } };

        await controller.list(
            { _search: search, _limit: 20, _offset: 0, _order: {} } as any,
            status,
            owner
        );

        const find = { ...search, ...status, ...owner };
        expect(workspaceAdminService.findAll).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 0,
            order: {},
        });
        expect(workspaceAdminService.getTotal).toHaveBeenCalledWith(find);
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

    describe('updateStatus', () => {
        const owner = { id: 'owner-1' };
        const admin = { user: 'admin-1' } as any;

        it('suspends a workspace and logs it on the owner', async () => {
            const workspace = {
                id: 'w1',
                owner,
                status: ENUM_WORKSPACE_STATUS.ACTIVE,
            };
            workspaceAdminService.findEntityById.mockResolvedValue(workspace);

            await controller.updateStatus(
                'w1',
                { status: ENUM_WORKSPACE_STATUS.SUSPENDED },
                admin
            );

            expect(workspaceAdminService.updateStatus).toHaveBeenCalledWith(
                workspace,
                ENUM_WORKSPACE_STATUS.SUSPENDED
            );
            expect(
                activityService.createByAdminWithWorkspace
            ).toHaveBeenCalledWith(owner, 'admin-1', workspace, {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                metadata: {
                    old: { status: ENUM_WORKSPACE_STATUS.ACTIVE },
                    new: { status: ENUM_WORKSPACE_STATUS.SUSPENDED },
                },
            });
        });

        it('does nothing when the status is already set', async () => {
            workspaceAdminService.findEntityById.mockResolvedValue({
                id: 'w1',
                owner,
                status: ENUM_WORKSPACE_STATUS.SUSPENDED,
            });

            await controller.updateStatus(
                'w1',
                { status: ENUM_WORKSPACE_STATUS.SUSPENDED },
                admin
            );

            expect(workspaceAdminService.updateStatus).not.toHaveBeenCalled();
            expect(
                activityService.createByAdminWithWorkspace
            ).not.toHaveBeenCalled();
        });

        it('answers 404 for an unknown workspace', async () => {
            workspaceAdminService.findEntityById.mockResolvedValue(null);

            await expect(
                controller.updateStatus(
                    'nope',
                    { status: ENUM_WORKSPACE_STATUS.SUSPENDED },
                    admin
                )
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
