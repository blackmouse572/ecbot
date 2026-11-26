import { AccountAdminController } from 'src/modules/account/controllers/account.admin.controller';

describe('AccountAdminController', () => {
    // The admin account page shows who linked the account and who last
    // changed it, and repositories no longer join those users by default.
    it('loads the audit users for the account detail', async () => {
        const accountService = {
            findOneByIdOrSlug: jest.fn().mockResolvedValue({ id: 'a1' }),
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
});
