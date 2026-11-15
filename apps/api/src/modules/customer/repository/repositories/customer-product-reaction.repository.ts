import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerProductReactionEntity } from '../entities/customer-product-reaction.entity';

@Injectable()
export class CustomerProductReactionRepository extends DatabaseRepository<CustomerProductReactionEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerProductReactionEntity);
    }

    /** The "Tạm hoãn" still running, soonest end first, with the product group. */
    findActiveByCustomer(
        customerId: string
    ): Promise<CustomerProductReactionEntity[]> {
        return this.find(
            { customer: customerId, until: { $gt: new Date() } },
            { populate: ['productGroup'], orderBy: { until: 'ASC' } }
        );
    }
}
