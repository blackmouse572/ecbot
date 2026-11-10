import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerProductReactionEntity } from '../entities/customer-product-reaction.entity';

@Injectable()
export class CustomerProductReactionRepository extends DatabaseRepository<CustomerProductReactionEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerProductReactionEntity);
    }
}
