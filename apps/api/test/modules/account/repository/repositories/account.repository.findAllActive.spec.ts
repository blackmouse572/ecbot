import { ENUM_ACCOUNT_STATUS } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { EntityManager } from '@mikro-orm/postgresql';

describe('AccountRepository.findAllActive', () => {
    let repo: AccountRepository;

    beforeEach(() => {
        const em = {
            find: jest.fn().mockResolvedValue([]),
        } as unknown as EntityManager;
        repo = new AccountRepository(em);
    });

    it('delegates to find with ACTIVE status and no deleted accounts', async () => {
        const spy = jest.spyOn(repo as any, 'find').mockResolvedValue([]);
        await repo.findAllActive();
        expect(spy).toHaveBeenCalledWith({
            status: ENUM_ACCOUNT_STATUS.ACTIVE,
            deletedAt: null,
        });
    });

    it('returns the result from find', async () => {
        const accounts = [{ id: 'a1' } as AccountEntity];
        jest.spyOn(repo as any, 'find').mockResolvedValue(accounts);
        const result = await repo.findAllActive();
        expect(result).toBe(accounts);
    });
});
