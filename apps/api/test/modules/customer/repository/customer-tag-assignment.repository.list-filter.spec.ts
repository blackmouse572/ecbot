import { CustomerTagAssignmentRepository } from '@app/modules/customer/repository/repositories/customer-tag-assignment.repository';
import { EntityManager } from '@mikro-orm/postgresql';

// The conversations list narrows to customers holding any of the picked tags.
describe('CustomerTagAssignmentRepository customerListFilter', () => {
    it('matches customers with any live assignment of the tags', () => {
        const qb = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getKnexQuery: jest.fn().mockReturnValue('sub-query'),
        };
        const em = {
            createQueryBuilder: jest.fn().mockReturnValue(qb),
        } as unknown as EntityManager;
        const repo = new CustomerTagAssignmentRepository(em);

        expect(repo.customerListFilter(['tag-1', 'tag-2'])).toEqual({
            id: { $in: 'sub-query' },
        });
        expect(qb.select).toHaveBeenCalledWith('a.customer');
        expect(qb.where).toHaveBeenCalledWith({
            tag: { $in: ['tag-1', 'tag-2'] },
            deletedAt: null,
        });
    });
});
