import { AccountAdminController } from 'src/modules/account/controllers/account.admin.controller';
import { AccountService } from 'src/modules/account/services/account.service';

describe('AccountAdminController', () => {
    // The admin account page shows who linked the account and who last
    // changed it, and repositories no longer join those users by default.
    it('loads the audit users for the account detail', async () => {
        const accountService = {
            findOneByIdOrSlug: jest.fn().mockResolvedValue({ id: 'a1' }),
            mapDetail: jest.fn(),
        };
        const controller = new AccountAdminController(
            {} as any,
            accountService as any,
            {} as any
        );

        await controller.get('a1');

        expect(accountService.findOneByIdOrSlug).toHaveBeenCalledWith('a1', {
            populate: ['createdBy', 'updatedBy'],
        });
    });

    it('returns only the public fields of the audit users', async () => {
        const user = {
            id: 'u1',
            name: 'Ada',
            email: 'ada@example.com',
            password: 'argon2-hash',
            salt: 'salt',
            mfaSecret: 'secret',
        };
        const account = { id: 'a1', createdBy: user, updatedBy: user };
        const accountService = {
            findOneByIdOrSlug: jest.fn().mockResolvedValue(account),
            mapDetail: jest.fn(AccountService.prototype.mapDetail),
        };
        const controller = new AccountAdminController(
            {} as any,
            accountService as any,
            {} as any
        );

        const { data } = await controller.get('a1');

        // One narrowing contract for this DTO: the workspace route's.
        expect(accountService.mapDetail).toHaveBeenCalledWith(account);

        for (const by of [data!.createdBy, data!.updatedBy]) {
            expect(by).toMatchObject({ id: 'u1', name: 'Ada' });
            expect(by).not.toHaveProperty('password');
            expect(by).not.toHaveProperty('salt');
            expect(by).not.toHaveProperty('mfaSecret');
        }
    });
});
