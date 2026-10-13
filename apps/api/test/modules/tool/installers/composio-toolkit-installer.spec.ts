import { ComposioToolkitInstaller } from '../../../../src/modules/tool/installers/composio-toolkit-installer';

// The installed tool reads as the toolkit, not as its slug (#189).
describe('ComposioToolkitInstaller.complete', () => {
    function setup(getToolkit: jest.Mock) {
        const api = {
            findOrCreateMcpServer: jest.fn(async () => ({ id: 'srv-1' })),
            generateMcpUrl: jest.fn(async () => 'https://mcp.example/x'),
            listToolkitActions: jest.fn(async () => []),
            getToolkit,
        };
        const toolRepo = {
            create: jest.fn(async (data: object) => ({
                id: 'tool-1',
                ...data,
            })),
        };
        const em = { flush: jest.fn(), nativeDelete: jest.fn() };
        const installer = new ComposioToolkitInstaller(
            api as any,
            toolRepo as any,
            {} as any,
            { mint: jest.fn(async () => 'composio-googlesheets') } as any,
            em as any,
            { getToolkitBySlug: getToolkit } as any
        );
        const session = {
            id: 'sess-1',
            expiresAt: new Date(Date.now() + 60_000),
            workspace: { id: 'ws-1' },
            draftDisplayName: 'Google Sheets',
            draftSource: { toolkit: 'googlesheets', connectedAccountId: null },
        };
        return { installer, toolRepo, session };
    }

    it("describes the tool with Composio's description of the toolkit", async () => {
        const { installer, toolRepo, session } = setup(
            jest.fn(async () => ({
                meta: { description: 'Create, read and edit spreadsheets.' },
            }))
        );

        await installer.complete(session as any, {});

        expect(toolRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                displayName: 'Google Sheets',
                description: 'Create, read and edit spreadsheets.',
            }),
            expect.anything()
        );
    });

    it('still installs when the description cannot be fetched', async () => {
        const { installer, toolRepo, session } = setup(
            // getToolkitBySlug swallows Composio errors and answers null.
            jest.fn(async () => null)
        );

        await installer.complete(session as any, {});

        expect(toolRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                description: 'Composio toolkit: googlesheets',
            }),
            expect.anything()
        );
    });
});
