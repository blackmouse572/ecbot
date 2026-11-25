import { knex as createKnex } from '@mikro-orm/postgresql';
import { MarketingEventRepository } from '../../../../src/modules/customer/repository/repositories/marketing-event.repository';
import { CustomerMarketingStateRepository } from '../../../../src/modules/customer/repository/repositories/customer-marketing-state.repository';

describe('CustomerMarketingStateRepository.customerListFilter source', () => {
    it('matches the first source or any later arrival through the source or its codes', () => {
        const knex = createKnex({ client: 'pg' });
        const repo = new CustomerMarketingStateRepository({
            getKnex: () => knex,
        } as any);

        // customerIds is private; stub it to keep the first-source part simple.
        Object.assign(repo as any, {
            customerIds: () => 'first-source-ids',
        });
        const filter = repo.customerListFilter({ sourceId: 'src-1' }) as any;

        // The first source still matches on its own, or any later arrival.
        expect(filter.$and[0].$or[0]).toEqual({
            id: { $in: 'first-source-ids' },
        });
        const sql = filter.$and[0].$or[1].id.$in.toQuery();
        expect(sql).toContain('from "marketing_events" as "e"');
        expect(sql).toContain('"e"."kind" = \'SOURCE\'');
        expect(sql).toContain(
            'select "id" from "tracked_links" where "id" = \'src-1\' or "parent_id" = \'src-1\''
        );
        expect(sql).toContain('COALESCE(c.merged_into_customer_id, c.id)');
    });
});

describe('MarketingEventRepository.findLinks', () => {
    it('leaves out deleted links, so they name nothing', async () => {
        const find = jest.fn().mockResolvedValue([]);
        const repo = new MarketingEventRepository({ find } as any);

        await repo.findLinks(['l1', 'l1', 'l2']);

        expect(find.mock.calls[0][1]).toEqual({
            id: { $in: ['l1', 'l2'] },
            deletedAt: null,
        });
    });
});
