import { EcchoCatalogService } from 'src/modules/tool/services/eccho-catalog.service';

describe('EcchoCatalogService', () => {
    const overrides = { findBySlug: jest.fn(), findAllBySlug: jest.fn() };
    const service = new EcchoCatalogService(overrides as any);

    beforeEach(() => {
        jest.clearAllMocks();
        overrides.findAllBySlug.mockResolvedValue(new Map());
        overrides.findBySlug.mockResolvedValue(null);
    });

    it('shows the code defaults when nothing was edited', async () => {
        const page = await service.getToolkits({ limit: 10, offset: 0 });

        expect(page.items.map(i => i.slug)).toContain('kiotviet');
        expect(page.items[0].name).toBe('KiotViet');
    });

    it('applies edited fields and falls back to defaults for null ones', async () => {
        overrides.findAllBySlug.mockResolvedValue(
            new Map([
                [
                    'kiotviet',
                    {
                        name: 'KiotViet VN',
                        description: null,
                        categories: [{ id: 'pos', name: 'POS' }],
                        disabled: false,
                    },
                ],
            ])
        );

        const [item] = (await service.getToolkits({ limit: 10, offset: 0 }))
            .items;

        expect(item.name).toBe('KiotViet VN');
        expect(item.description).toContain('KiotViet retail');
        expect(item.categories).toEqual([{ id: 'pos', name: 'POS' }]);
    });

    it('hides a disabled toolkit from workspaces but not from admins', async () => {
        overrides.findAllBySlug.mockResolvedValue(
            new Map([['kiotviet', { disabled: true }]])
        );
        overrides.findBySlug.mockResolvedValue({ disabled: true });

        expect(
            (await service.getToolkits({ limit: 10, offset: 0 })).total
        ).toBe(0);
        expect(await service.getCategories()).toEqual([]);
        expect(await service.findMergedBySlug('kiotviet')).toMatchObject({
            disabled: true,
        });
    });

    it('uses the edited server URL without a trailing slash', async () => {
        overrides.findBySlug.mockResolvedValue({
            serverUrl: 'https://kv.example.com/',
        });

        expect(await service.findMergedBySlug('kiotviet')).toMatchObject({
            baseUrl: 'https://kv.example.com',
        });
    });
});
