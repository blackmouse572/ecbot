import { ForbiddenException } from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS } from 'src/modules/workspace/enums/workspace.enum';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from 'src/modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceGuard } from 'src/modules/workspace/guards/workspace.guard';

describe('WorkspaceGuard', () => {
    const workspaceService = { findOneByIdOrSlug: jest.fn() };
    const guard = new WorkspaceGuard(workspaceService as any);
    const context = (request: Record<string, any>) =>
        ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

    it('loads an active workspace onto the request', async () => {
        const workspace = { id: 'w1', status: ENUM_WORKSPACE_STATUS.ACTIVE };
        workspaceService.findOneByIdOrSlug.mockResolvedValue(workspace);
        const request: Record<string, any> = { params: { workspace: 'w1' } };

        await expect(guard.canActivate(context(request))).resolves.toBe(true);
        expect(request.__workspace).toBe(workspace);
    });

    it('locks a workspace an admin suspended', async () => {
        workspaceService.findOneByIdOrSlug.mockResolvedValue({
            id: 'w1',
            status: ENUM_WORKSPACE_STATUS.SUSPENDED,
        });

        const result = guard.canActivate(
            context({ params: { workspace: 'w1' } })
        );

        await expect(result).rejects.toBeInstanceOf(ForbiddenException);
        await expect(result).rejects.toMatchObject({
            response: {
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.SUSPENDED,
                message: 'workspace.error.suspended',
            },
        });
    });
});
