import { ToolkitAdminService } from 'src/modules/tool/services/toolkit.admin.service';

describe('ToolkitAdminService', () => {
    const toolRepository = { countUsageByToolkit: jest.fn() };
    const ecchoCatalog = { getToolkits: jest.fn() };
    const composioCatalog = { getToolkits: jest.fn() };
    const config = { get: jest.fn() };
    const service = new ToolkitAdminService(
        toolRepository as any,
        ecchoCatalog as any,
        composioCatalog as any,
        config as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists Ecbot toolkits with usage and whether their server is set', async () => {
        ecchoCatalog.getToolkits.mockReturnValue({
            items: [
                {
                    slug: 'kiotviet',
                    name: 'KiotViet',
                    description: 'Retail',
                    categories: [{ id: 'ecommerce', name: 'E-commerce' }],
                },
            ],
            total: 1,
        });
        toolRepository.countUsageByToolkit.mockResolvedValue(
            new Map([['kiotviet', { workspaceCount: 2, toolCount: 3 }]])
        );

        const rows = await service.listEccho();

        expect(toolRepository.countUsageByToolkit).toHaveBeenCalledWith(
            'ECCHO'
        );
        expect(rows).toEqual([
            expect.objectContaining({
                slug: 'kiotviet',
                name: 'KiotViet',
                workspaceCount: 2,
                toolCount: 3,
                configured: expect.any(Boolean),
            }),
        ]);
    });

    it('pages the Composio catalog with usage, zero when unused', async () => {
        composioCatalog.getToolkits.mockResolvedValue({
            items: [
                { slug: 'gmail', name: 'Gmail', categories: [] },
                { slug: 'slack', name: 'Slack', categories: [] },
            ],
            total: 40,
        });
        toolRepository.countUsageByToolkit.mockResolvedValue(
            new Map([['gmail', { workspaceCount: 1, toolCount: 1 }]])
        );

        const page = await service.listComposio({
            search: 'a',
            limit: 20,
            offset: 20,
        });

        expect(composioCatalog.getToolkits).toHaveBeenCalledWith({
            search: 'a',
            limit: 20,
            offset: 20,
        });
        expect(page.total).toBe(40);
        expect(page.items.map(i => [i.slug, i.workspaceCount])).toEqual([
            ['gmail', 1],
            ['slack', 0],
        ]);
    });

    it('reports Composio as not configured without an API key', async () => {
        config.get.mockReturnValue(undefined);
        toolRepository.countUsageByToolkit.mockResolvedValue(new Map());

        const status = await service.composioStatus();

        expect(status).toMatchObject({
            apiKeyConfigured: false,
            reachable: false,
            toolkitCount: 0,
        });
        expect(composioCatalog.getToolkits).not.toHaveBeenCalled();
    });

    it('reports Composio reachable and sums usage across toolkits', async () => {
        config.get.mockImplementation((key: string) =>
            key === 'composio.apiKey' ? 'key' : 'https://backend.composio.dev'
        );
        composioCatalog.getToolkits.mockResolvedValue({
            items: [],
            total: 980,
        });
        toolRepository.countUsageByToolkit.mockResolvedValue(
            new Map([
                ['gmail', { workspaceCount: 2, toolCount: 2 }],
                ['slack', { workspaceCount: 1, toolCount: 1 }],
            ])
        );

        await expect(service.composioStatus()).resolves.toEqual({
            apiKeyConfigured: true,
            reachable: true,
            baseUrl: 'https://backend.composio.dev',
            toolkitCount: 980,
            installedToolkitCount: 2,
            toolCount: 3,
        });
    });
});
