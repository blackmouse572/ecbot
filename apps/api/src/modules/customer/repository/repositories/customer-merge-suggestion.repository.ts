import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../../enums/customer.enum';
import { CustomerMergeSuggestionEntity } from '../entities/customer-merge-suggestion.entity';

@Injectable()
export class CustomerMergeSuggestionRepository extends DatabaseRepository<CustomerMergeSuggestionEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerMergeSuggestionEntity);
    }

    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerMergeSuggestionEntity[]> {
        const filter: Record<string, any> = {
            workspace: workspaceId,
            deletedAt: null,
            ...find,
        };
        return this.find(filter as any, options);
    }

    async countPendingByWorkspace(workspaceId: string): Promise<number> {
        return this.getTotal({
            workspace: workspaceId,
            status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
            deletedAt: null,
        });
    }

    async findOneByPair(
        workspaceId: string,
        customerAId: string,
        customerBId: string,
        matchField: 'phone' | 'email'
    ): Promise<CustomerMergeSuggestionEntity | null> {
        return this.findOne({
            workspace: workspaceId,
            customerA: customerAId,
            customerB: customerBId,
            matchField,
            deletedAt: null,
        } as any);
    }

    async findPendingCustomerIdsByWorkspace(
        workspaceId: string
    ): Promise<string[]> {
        const rows = await this.find(
            {
                workspace: workspaceId,
                status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
                deletedAt: null,
            } as any,
            { populate: [] } as any
        );
        const ids = new Set<string>();
        for (const row of rows) {
            const a = (row.customerA as any)?.id ?? row.customerA;
            const b = (row.customerB as any)?.id ?? row.customerB;
            if (a) ids.add(a);
            if (b) ids.add(b);
        }
        return Array.from(ids);
    }
}
