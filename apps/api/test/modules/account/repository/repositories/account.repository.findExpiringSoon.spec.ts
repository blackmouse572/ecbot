import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '@app/modules/account/enums/account.enum';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { EntityManager } from '@mikro-orm/postgresql';

describe('AccountRepository.findExpiringSoon', () => {
    const NOW = new Date('2026-10-12T10:00:00Z').getTime();
    let repo: AccountRepository;
    let find: jest.SpyInstance;

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        repo = new AccountRepository({} as EntityManager);
        find = jest.spyOn(repo as any, 'find').mockResolvedValue([]);
    });

    afterEach(() => jest.restoreAllMocks());

    it('looks thresholdMinutes ahead for every account', async () => {
        await repo.findExpiringSoon(30);
        expect(find).toHaveBeenCalledWith({
            $or: [{ tokenExpiresAt: { $lte: new Date(NOW + 30 * 60_000) } }],
            status: { $ne: ENUM_ACCOUNT_STATUS.BLOCKED },
            deletedAt: null,
        });
    });

    it('looks further ahead for the types given an early window', async () => {
        await repo.findExpiringSoon(30, {
            types: [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE],
            minutes: 7 * 24 * 60,
        });
        expect(find.mock.calls[0][0].$or).toEqual([
            { tokenExpiresAt: { $lte: new Date(NOW + 30 * 60_000) } },
            {
                type: { $in: [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE] },
                tokenExpiresAt: {
                    $lte: new Date(NOW + 7 * 24 * 60 * 60_000),
                },
            },
        ]);
    });
});
