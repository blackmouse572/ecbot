import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerMarketingStateEntity } from '../entities/customer-marketing-state.entity';

@Injectable()
export class CustomerMarketingStateRepository extends DatabaseRepository<CustomerMarketingStateEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerMarketingStateEntity);
    }

    findByCustomer(
        customerId: string,
        em?: EntityManager
    ): Promise<CustomerMarketingStateEntity | null> {
        return (em ?? this.em).findOne(CustomerMarketingStateEntity, {
            customer: customerId,
        });
    }
}
