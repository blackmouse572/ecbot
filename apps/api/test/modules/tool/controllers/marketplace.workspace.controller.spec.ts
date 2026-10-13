import { ForbiddenException } from '@nestjs/common';
import { MarketplaceWorkspaceController } from 'src/modules/tool/controllers/marketplace.workspace.controller';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';

// #253 review: reconnecting used to hand the owner a fresh ACTIVE tool in
// place of the one an admin turned off.
describe('MarketplaceWorkspaceController reauth', () => {
    it('refuses a tool an admin turned off', async () => {
        const registry: any = { get: jest.fn() };
        const toolRepo: any = {
            findOneInWorkspace: jest.fn().mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.REVOKED,
            }),
        };
        const controller = new MarketplaceWorkspaceController(
            {} as any,
            {} as any,
            registry,
            toolRepo,
            {} as any,
            {} as any,
            {} as any
        );

        await expect(
            controller.reauth(
                { id: 'ws-1' } as any,
                { toolId: 't-1', callbackUrl: 'https://app/cb' } as any,
                {} as any
            )
        ).rejects.toEqual(
            new ForbiddenException('tool.execute.error.inactive')
        );
        expect(registry.get).not.toHaveBeenCalled();
    });
});
