import { ToolkitAdminController } from 'src/modules/tool/controllers/toolkit.admin.controller';

describe('ToolkitAdminController', () => {
    const toolkitAdminService = {
        listEccho: jest.fn(),
        listComposio: jest.fn(),
        composioStatus: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(2) };
    const controller = new ToolkitAdminController(
        toolkitAdminService as any,
        paginationService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists Ecbot toolkits as one page', async () => {
        toolkitAdminService.listEccho.mockResolvedValue([{ slug: 'kiotviet' }]);
        paginationService.totalPage.mockReturnValue(1);

        await expect(controller.eccho()).resolves.toEqual({
            _pagination: { total: 1, totalPage: 1 },
            data: [{ slug: 'kiotviet' }],
        });
    });

    it('pages the Composio catalog with the search term', async () => {
        toolkitAdminService.listComposio.mockResolvedValue({
            items: [{ slug: 'gmail' }],
            total: 30,
        });
        paginationService.totalPage.mockReturnValue(2);

        const result = await controller.composio(
            { _limit: 20, _offset: 20 } as any,
            ' mail '
        );

        expect(toolkitAdminService.listComposio).toHaveBeenCalledWith({
            search: 'mail',
            limit: 20,
            offset: 20,
        });
        expect(result).toEqual({
            _pagination: { total: 30, totalPage: 2 },
            data: [{ slug: 'gmail' }],
        });
    });

    it('returns the Composio connection status', async () => {
        toolkitAdminService.composioStatus.mockResolvedValue({
            apiKeyConfigured: true,
        });

        await expect(controller.composioStatus()).resolves.toEqual({
            data: { apiKeyConfigured: true },
        });
    });
});
