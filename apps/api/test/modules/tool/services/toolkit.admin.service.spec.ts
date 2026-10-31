import { ToolkitAdminService } from 'src/modules/tool/services/toolkit.admin.service';

describe('ToolkitAdminService', () => {
    const toolRepository = {
        countUsageByToolkit: jest.fn(),
        findByEcchoToolkit: jest.fn(),
    };
    const overrideRepository = {
        findBySlug: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };
    const ecchoCatalog = {
        listMerged: jest.fn(),
        findMergedBySlug: jest.fn(),
        findBySlug: jest.fn(),
    };
    const composioCatalog = { getToolkits: jest.fn() };
    const config = { get: jest.fn() };
    const service = new ToolkitAdminService(
        toolRepository as any,
        overrideRepository as any,
        ecchoCatalog as any,
        composioCatalog as any,
        config as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists Ecbot toolkits with usage and whether their server is set', async () => {
        ecchoCatalog.listMerged.mockResolvedValue([
            {
                slug: 'kiotviet',
                name: 'KiotViet',
                description: 'Retail',
                categories: [{ id: 'ecommerce', name: 'E-commerce' }],
                baseUrl: 'https://kiotviet.example.com',
                disabled: false,
            },
        ]);
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
                configured: true,
                disabled: false,
            }),
        ]);
    });

    describe('Ecbot toolkit detail and edit', () => {
        const def = {
            slug: 'kiotviet',
            name: 'KiotViet',
            description: 'Retail',
            categories: [],
            baseUrl: '',
        };

        beforeEach(() => {
            ecchoCatalog.findBySlug.mockReturnValue(def);
            ecchoCatalog.findMergedBySlug.mockResolvedValue({
                ...def,
                name: 'KiotViet VN',
                disabled: false,
            });
            toolRepository.countUsageByToolkit.mockResolvedValue(new Map());
            toolRepository.findByEcchoToolkit.mockResolvedValue([
                {
                    id: 't1',
                    displayName: 'Shop kho',
                    status: 'ACTIVE',
                    createdAt: new Date(0),
                    workspace: { id: 'w1', name: 'Shop A' },
                },
            ]);
        });

        it('returns code defaults, changed fields and installed tools', async () => {
            overrideRepository.findBySlug.mockResolvedValue({
                name: 'KiotViet VN',
            });

            const detail = await service.getEccho('kiotviet');

            expect(detail).toMatchObject({
                name: 'KiotViet VN',
                defaults: { name: 'KiotViet' },
                overriddenFields: ['name'],
                configured: false,
                tools: [{ id: 't1', workspaceName: 'Shop A' }],
            });
        });

        it('404s on a slug that is not an Ecbot toolkit', async () => {
            ecchoCatalog.findMergedBySlug.mockResolvedValue(undefined);
            ecchoCatalog.findBySlug.mockReturnValue(undefined);

            await expect(service.getEccho('nope')).rejects.toThrow();
            await expect(
                service.updateEccho('nope', { name: 'x' }, { id: 'u' } as any)
            ).rejects.toThrow();
        });

        it('creates the override on first edit and ignores absent fields', async () => {
            overrideRepository.findBySlug.mockResolvedValue(null);

            await service.updateEccho('kiotviet', { name: 'KiotViet VN' }, {
                id: 'u1',
            } as any);

            expect(overrideRepository.create).toHaveBeenCalledWith(
                { slug: 'kiotviet', name: 'KiotViet VN' },
                { actionBy: 'u1' }
            );
        });

        it('clears a field sent as null on an existing override', async () => {
            const existing = { slug: 'kiotviet', name: 'KiotViet VN' };
            overrideRepository.findBySlug.mockResolvedValue(existing);

            await service.updateEccho(
                'kiotviet',
                { name: null, disabled: true },
                { id: 'u1' } as any
            );

            expect(overrideRepository.save).toHaveBeenCalledWith(
                { slug: 'kiotviet', name: null, disabled: true },
                { actionBy: 'u1' }
            );
        });
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

    it('reports Composio unreachable when the key is set but the catalog comes back empty', async () => {
        config.get.mockImplementation((key: string) =>
            key === 'composio.apiKey' ? 'key' : 'https://backend.composio.dev'
        );
        composioCatalog.getToolkits.mockResolvedValue({ items: [], total: 0 });
        toolRepository.countUsageByToolkit.mockResolvedValue(new Map());

        const status = await service.composioStatus();

        expect(status).toMatchObject({
            apiKeyConfigured: true,
            reachable: false,
            toolkitCount: 0,
        });
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
