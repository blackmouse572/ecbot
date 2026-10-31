import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

// A hidden Ecbot toolkit must not fall through to the Composio installer.
describe('MarketplaceWorkspaceController hidden Ecbot toolkit', () => {
    const build = () => {
        const registry: any = { get: jest.fn() };
        const ecchoCatalog: any = {
            findMergedBySlug: jest
                .fn()
                .mockResolvedValue({ slug: 'kiotviet', disabled: true }),
        };
        const catalog: any = { getToolkitAccess: jest.fn() };
        const controller = new MarketplaceWorkspaceController(
            catalog,
            ecchoCatalog,
            registry,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );
        return { controller, registry, catalog };
    };

    it('refuses a new install', async () => {
        const { controller, registry } = build();

        await expect(
            controller.startInstall(
                { id: 'ws-1' } as any,
                { toolkitSlug: 'kiotviet' } as any,
                {} as any
            )
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(registry.get).not.toHaveBeenCalled();
    });

    it('does not ask Composio about its access', async () => {
        const { controller, catalog } = build();

        await expect(
            controller.getToolkitAccess('kiotviet')
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(catalog.getToolkitAccess).not.toHaveBeenCalled();
    });
});
