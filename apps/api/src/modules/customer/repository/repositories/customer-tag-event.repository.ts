import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerTagEventEntity } from '../entities/customer-tag-event.entity';

@Injectable()
export class CustomerTagEventRepository extends DatabaseRepository<CustomerTagEventEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerTagEventEntity);
    }
}
