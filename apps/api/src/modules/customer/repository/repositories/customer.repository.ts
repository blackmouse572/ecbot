import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    /** The workspace's customers, without deleted ones or merged-away duplicates. */
    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerEntity[]> {
        return this.find(this.workspaceFilter(workspaceId, find), options);
    }

    async countByWorkspace(
        workspaceId: string,
        find?: Record<string, any>
    ): Promise<number> {
        return this.getTotal(this.workspaceFilter(workspaceId, find));
    }

    // A merge keeps the losing row with mergedIntoCustomerId set; listing it
    // would show the same person twice.
    private workspaceFilter(
        workspaceId: string,
        find?: Record<string, any>
    ): FilterQuery<CustomerEntity> {
        return {
            workspace: workspaceId,
            deletedAt: null,
            mergedIntoCustomerId: null,
            ...find,
        } as FilterQuery<CustomerEntity>;
    }
}
