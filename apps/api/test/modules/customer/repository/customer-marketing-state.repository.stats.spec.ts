import { knex as createKnex } from '@mikro-orm/postgresql';
import { CustomerMarketingStateRepository } from '../../../../src/modules/customer/repository/repositories/customer-marketing-state.repository';

describe('CustomerMarketingStateRepository.statsBySource', () => {
    const buildRepo = (execute: jest.Mock) =>
        new CustomerMarketingStateRepository({
            getConnection: () => ({ execute }),
        } as any);

    it('returns nothing for no links without hitting the DB', async () => {
        const execute = jest.fn();

        expect(await buildRepo(execute).statsBySource('ws-1', [])).toEqual([]);
        expect(execute).not.toHaveBeenCalled();
    });

    it('counts new and returning customers per link, and each order once for the last link', async () => {
        const execute = jest.fn().mockResolvedValue([
            {
                link_id: 'l2',
                new_customers: '1',
                returning_customers: '2',
                potential_customers: '2',
                orders: '2',
            },
        ]);

        const rows = await buildRepo(execute).statsBySource('ws-1', [
            'l1',
            'l2',
        ]);

        expect(rows).toEqual([
            {
                linkId: 'l2',
                newCustomers: 1,
                returningCustomers: 2,
                potentialCustomers: 2,
                orders: 2,
            },
        ]);
        const [sql, params] = execute.mock.calls[0];
        expect(params[0]).toBe('ws-1');
        expect(params[2]).toEqual(['l1', 'l2']);
        // Every arrival counts, under the customer a merged one went into.
        expect(sql).toContain("e.kind = 'SOURCE'");
        expect(sql).toContain('COALESCE(c.merged_into_customer_id, c.id)');
        expect(sql).toContain('s.first_tracked_link_id = a.link_id AS is_new');
        // Last touch: the latest arrival at or before the order.
        expect(sql).toContain('a.at <= o.ordered_at');
        expect(sql).toContain('ORDER BY a.at DESC');
    });
});

describe('CustomerMarketingStateRepository.customerListFilter source', () => {
    it('matches every customer who ever arrived through the source or its codes', () => {
        const knex = createKnex({ client: 'pg' });
        const repo = new CustomerMarketingStateRepository({
            getKnex: () => knex,
        } as any);

        const filter = repo.customerListFilter({ sourceId: 'src-1' });

        const sql = filter.$and[0].id.$in.toQuery();
        expect(sql).toContain('from "marketing_events" as "e"');
        expect(sql).toContain('"e"."kind" = \'SOURCE\'');
        expect(sql).toContain(
            'select "id" from "tracked_links" where "id" = \'src-1\' or "parent_id" = \'src-1\''
        );
        expect(sql).toContain('COALESCE(c.merged_into_customer_id, c.id)');
    });
});
