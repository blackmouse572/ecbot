import { CustomerRepository } from '@app/modules/customer/repository/repositories/customer.repository';
import { EntityManager } from '@mikro-orm/postgresql';

// A merge keeps the losing row with mergedIntoCustomerId set; listing it would
// show the same person twice.
describe('CustomerRepository list', () => {
    let repo: CustomerRepository;

    beforeEach(() => {
        repo = new CustomerRepository({} as EntityManager);
    });

    it('lists the workspace customers that are not deleted or merged away', async () => {
        const find = jest.spyOn(repo as any, 'find').mockResolvedValue([]);

        await repo.findByWorkspace(
            'ws-1',
            { name: { $ilike: '%an%' } },
            { paging: { limit: 20, offset: 0 } }
        );

        expect(find).toHaveBeenCalledWith(
            {
                workspace: 'ws-1',
                deletedAt: null,
                mergedIntoCustomerId: null,
                name: { $ilike: '%an%' },
            },
            { paging: { limit: 20, offset: 0 } }
        );
    });

    it('counts with the same filter', async () => {
        const getTotal = jest
            .spyOn(repo, 'getTotal')
            .mockResolvedValue(7 as never);

        await expect(
            repo.countByWorkspace('ws-1', { phone: '0909' })
        ).resolves.toBe(7);

        expect(getTotal).toHaveBeenCalledWith({
            workspace: 'ws-1',
            deletedAt: null,
            mergedIntoCustomerId: null,
            phone: '0909',
        });
    });
});
