import { knex as createKnex } from '@mikro-orm/postgresql';
import { CustomerMarketingStateRepository } from '../../../../src/modules/customer/repository/repositories/customer-marketing-state.repository';

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
