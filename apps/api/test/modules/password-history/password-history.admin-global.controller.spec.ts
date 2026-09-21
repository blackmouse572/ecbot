import { PasswordHistoryAdminGlobalController } from '../../../src/modules/password-history/controllers/password-history.admin-global.controller';

describe('PasswordHistoryAdminGlobalController.list', () => {
    const mapped = [{ id: 'ph1' }];

    const build = () => {
        const passwordHistoryService = {
            // Rest params so mock.calls[N][0] indexes a real tuple element
            // instead of TS inferring a 0-arg call signature.
            findAll: jest.fn(async (..._args: unknown[]) => [{ id: 'ph1' }]),
            getTotal: jest.fn(async (..._args: unknown[]) => 3),
            mapAdminList: jest.fn(() => mapped),
        };
        const paginationService = { totalPage: jest.fn(() => 2) };
        const controller = new PasswordHistoryAdminGlobalController(
            paginationService as any,
            passwordHistoryService as any
        );
        return { controller, passwordHistoryService, paginationService };
    };

    const paging = () => ({
        _search: { $or: [{ 'user.email': { $ilike: '%a%' } }] },
        _limit: 20,
        _offset: 0,
        _order: { createdAt: 'DESC' as const },
    });

    it('composes find from search + type + user + createdAt filters', async () => {
        const { controller, passwordHistoryService } = build();
        const _type = { type: { $in: ['CHANGE'] } };
        const _user = { user: 'u1' };
        const _createdAt = { createdAt: { $gte: new Date('2026-01-01') } };

        await controller.list(paging() as any, _type, _user, _createdAt);

        const expectedFind = {
            ...paging()._search,
            ..._type,
            ..._user,
            ..._createdAt,
        };
        expect(passwordHistoryService.findAll).toHaveBeenCalledWith(
            expectedFind,
            { limit: 20, offset: 0, orderBy: { createdAt: 'DESC' } }
        );
    });

    it('passes the identical find to getTotal and findAll (parity)', async () => {
        const { controller, passwordHistoryService } = build();
        const _type = { type: { $in: ['SIGN_UP'] } };

        await controller.list(paging() as any, _type, undefined, undefined);

        const findArg = passwordHistoryService.findAll.mock.calls[0][0];
        const totalArg = passwordHistoryService.getTotal.mock.calls[0][0];
        expect(totalArg).toEqual(findArg);
    });

    it('omits absent filters and returns mapAdminList data with pagination', async () => {
        const { controller, passwordHistoryService, paginationService } =
            build();

        const result = await controller.list(
            paging() as any,
            undefined,
            undefined,
            undefined
        );

        expect(passwordHistoryService.findAll).toHaveBeenCalledWith(
            paging()._search,
            expect.anything()
        );
        expect(paginationService.totalPage).toHaveBeenCalledWith(3, 20);
        expect(result).toEqual({
            _pagination: { total: 3, totalPage: 2 },
            data: mapped,
        });
    });
});
