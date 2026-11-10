import { TrackedLinkWorkspaceController } from '../../../src/modules/customer/controllers/tracked-link.workspace.controller';
import { ENUM_TRACKED_LINK_STATUS } from '../../../src/modules/customer/enums/tracked-link.enum';

// The list query merges the workspace, the source-only filter, search and
// the account/status filters into one find object. A dropped key would list
// QR/KOL codes as sources or show another workspace's links.
describe('TrackedLinkWorkspaceController.list', () => {
    const trackedLinkService = {
        findAll: jest.fn(async () => []),
        getTotal: jest.fn(async () => 0),
        mapList: jest.fn(() => []),
    };
    const paginationService = { totalPage: jest.fn(() => 0) };
    const controller = new TrackedLinkWorkspaceController(
        trackedLinkService as any,
        paginationService as any,
        {} as any
    );

    it('lists only this workspace’s live sources, with search and filters', async () => {
        const search = { $or: [{ name: { $ilike: '%tet%' } }] };

        await controller.list(
            { id: 'ws-1' } as any,
            { _search: search, _limit: 20, _offset: 0, _order: {} } as any,
            { 'account.id': 'acc-1' },
            { status: { $in: [ENUM_TRACKED_LINK_STATUS.ACTIVE] } }
        );

        const expected = {
            ...search,
            'account.id': 'acc-1',
            status: { $in: [ENUM_TRACKED_LINK_STATUS.ACTIVE] },
            workspace: 'ws-1',
            parent: null,
            deletedAt: null,
        };
        expect(trackedLinkService.findAll).toHaveBeenCalledWith(expected, {
            paging: { limit: 20, offset: 0 },
            order: {},
        });
        expect(trackedLinkService.getTotal).toHaveBeenCalledWith(expected);
    });

    it('keeps the workspace and source-only filter when a filter tries to override them', async () => {
        await controller.list(
            { id: 'ws-1' } as any,
            {
                _search: { workspace: 'ws-2', parent: 'x' },
                _limit: 20,
                _offset: 0,
                _order: {},
            } as any,
            {},
            {}
        );

        expect(trackedLinkService.findAll).toHaveBeenLastCalledWith(
            expect.objectContaining({ workspace: 'ws-1', parent: null }),
            expect.anything()
        );
    });
});
