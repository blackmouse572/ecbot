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

    /**
     * Live customers per tag, in one query for a whole page of tags. Deleted
     * and merged-away customers are not counted.
     */
    async countCustomersByTags(tagIds: string[]): Promise<Map<string, number>> {
        if (tagIds.length === 0) return new Map();

        const rows: { id: string; customer_count: string }[] = await this.em
            .getConnection()
            .execute(
                `
                SELECT a.tag_id AS id, COUNT(*) AS customer_count
                FROM customer_tag_assignments a
                JOIN customers c ON c.id = a.customer_id
                WHERE a.tag_id IN (?)
                    AND a.deleted_at IS NULL
                    AND c.deleted_at IS NULL
                    AND c.merged_into_customer_id IS NULL
                GROUP BY a.tag_id
                `,
                [tagIds]
            );

        return new Map(rows.map(row => [row.id, Number(row.customer_count)]));
    }
}
