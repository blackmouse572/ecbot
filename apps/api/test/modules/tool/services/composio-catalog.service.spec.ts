import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ComposioCatalogService } from '../../../../src/modules/tool/services/composio-catalog.service';

// `GET /toolkits/googlesheets` as the REST API sends it (snake_case), trimmed
// to the fields read here.
const GOOGLESHEETS = {
    slug: 'googlesheets',
    name: 'Google Sheets',
    composio_managed_auth_schemes: ['OAUTH2'],
    auth_config_details: [
        {
            mode: 'OAUTH2',
            required_scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
        {
            // Not the managed scheme the installer uses: ignored.
            mode: 'BEARER_TOKEN',
            required_scopes: ['ignored-scope'],
            fields: { auth_config_creation: { required: [], optional: [] } },
        },
    ],
};

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
                            label: 'Batch get spreadsheet',
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
            getToolkit: jest.fn(async () =>
                'detail' in overrides ? overrides.detail : GOOGLESHEETS
            ),
        };
        return {
            api,
            cache,
            service: new ComposioCatalogService(api as any, cache as any),
        };
    }

    it("lists the actions, flags destructive ones, and the managed scheme's scopes", async () => {
        const { service } = setup();

        await expect(service.getToolkitAccess('googlesheets')).resolves.toEqual(
            {
                provider: 'composio',
                actions: [
                    {
                        name: 'GOOGLESHEETS_BATCH_GET',
                        label: 'Batch get spreadsheet',
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
                requiresSignIn: true,
            }
        );
    });

    it('adds Slack-style user scopes', async () => {
        const { service } = setup({
            detail: {
                composio_managed_auth_schemes: ['OAUTH2'],
                auth_config_details: [
                    {
                        mode: 'OAUTH2',
                        required_scopes: [],
                        fields: {
                            auth_config_creation: {
                                required: [],
                                optional: [
                                    { name: 'scopes', default: 'chat:write' },
                                    {
                                        name: 'user_scopes',
                                        default: 'search:read',
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        });

        const access = await service.getToolkitAccess('slack');

        expect(access.scopes).toEqual(['chat:write', 'search:read']);
    });

    it('needs no sign-in for a toolkit without auth', async () => {
        const { service } = setup({ detail: { name: 'Weather' } });

        const access = await service.getToolkitAccess('weather');

        expect(access).toMatchObject({ scopes: [], requiresSignIn: false });
    });

    it('caches the answer', async () => {
        const { service, api } = setup();

        await service.getToolkitAccess('googlesheets');
        await service.getToolkitAccess('googlesheets');

        expect(api.listToolkitActions).toHaveBeenCalledTimes(1);
    });

    // An empty answer would read as "this toolkit asks for no access".
    it('fails with 502, uncached, when Composio fails', async () => {
        const { service, api, cache } = setup();
        api.getToolkit.mockRejectedValueOnce(new Error('down'));

        await expect(
            service.getToolkitAccess('googlesheets')
        ).rejects.toBeInstanceOf(BadGatewayException);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('fails with 404 for an unknown toolkit', async () => {
        const { service, cache } = setup({ detail: null });

        await expect(service.getToolkitAccess('nope')).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(cache.set).not.toHaveBeenCalled();
    });
});
