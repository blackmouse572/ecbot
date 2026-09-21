import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerTagAssignmentEntity } from '../entities/customer-tag-assignment.entity';

@Injectable()
export class CustomerTagAssignmentRepository extends DatabaseRepository<CustomerTagAssignmentEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerTagAssignmentEntity);
    }

    async findByCustomer(
        customerId: string
    ): Promise<CustomerTagAssignmentEntity[]> {
        return this.find(
            {
                customer: customerId,
                deletedAt: null,
            } as any,
            { populate: ['tag'] } as any
        );
    }

    async findOneByCustomerAndTag(
        customerId: string,
        tagId: string
    ): Promise<CustomerTagAssignmentEntity | null> {
        return this.findOne({
            customer: customerId,
            tag: tagId,
            deletedAt: null,
        } as any);
    }

    async findByTag(tagId: string): Promise<CustomerTagAssignmentEntity[]> {
        return this.find({
            tag: tagId,
            deletedAt: null,
        } as any);
    }
}
