import { ComposioCatalogService } from '../../../../src/modules/tool/services/composio-catalog.service';

// What a toolkit can do and what access it asks for, shown before install (#189).
describe('ComposioCatalogService.getToolkitAccess', () => {
    function setup(overrides: { actions?: unknown; detail?: unknown } = {}) {
        const store = new Map<string, unknown>();
        const cache = {
            get: jest.fn(async (k: string) => store.get(k)),
            set: jest.fn(async (k: string, v: unknown) => {
                store.set(k, v);
            }),
        };
        const api = {
            listToolkitActions: jest.fn(
                async () =>
                    overrides.actions ?? [
                        {
                            name: 'GOOGLESHEETS_BATCH_GET',
                            description: 'Read ranges from a sheet',
                            inputSchema: {},
                        },
                        {
                            name: 'GOOGLESHEETS_DELETE_SHEET',
                            description: 'Delete a sheet',
                            inputSchema: {},
                        },
                    ]
            ),
            getToolkit: jest.fn(
                async () =>
                    overrides.detail ?? {
                        name: 'Google Sheets',
                        auth_config_details: [
                            {
                                mode: 'OAUTH2',
                                fields: {
                                    auth_config_creation: {
                                        required: [],
                                        optional: [
                                            {
                                                name: 'scopes',
                                                default:
                                                    'https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive',
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                    }
            ),
        };
        return {
            api,
            service: new ComposioCatalogService(api as any, cache as any),
        };
    }

    it('lists the actions, flags destructive ones, and the OAuth scopes', async () => {
        const { service } = setup();

        await expect(service.getToolkitAccess('googlesheets')).resolves.toEqual(
            {
                actions: [
                    {
                        name: 'GOOGLESHEETS_BATCH_GET',
                        description: 'Read ranges from a sheet',
                        destructive: false,
                    },
                    {
                        name: 'GOOGLESHEETS_DELETE_SHEET',
                        description: 'Delete a sheet',
                        destructive: true,
                    },
                ],
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive',
                ],
            }
        );
    });

    it('caches the answer', async () => {
        const { service, api } = setup();

        await service.getToolkitAccess('googlesheets');
        await service.getToolkitAccess('googlesheets');

        expect(api.listToolkitActions).toHaveBeenCalledTimes(1);
    });

    it('has no scopes for a toolkit without OAuth', async () => {
        const { service } = setup({ detail: { name: 'Weather' } });

        const access = await service.getToolkitAccess('weather');

        expect(access.scopes).toEqual([]);
    });

    it('answers empty, uncached, when Composio fails', async () => {
        const { service, api } = setup();
        api.listToolkitActions.mockRejectedValueOnce(new Error('down'));

        await expect(service.getToolkitAccess('googlesheets')).resolves.toEqual(
            {
                actions: [],
                scopes: [],
            }
        );
        await service.getToolkitAccess('googlesheets');
        expect(api.listToolkitActions).toHaveBeenCalledTimes(2);
    });
});
