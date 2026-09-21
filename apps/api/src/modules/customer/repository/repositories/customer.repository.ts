import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerEntity[]> {
        const filter: Record<string, any> = {
            workspace: workspaceId,
            deletedAt: null,
            ...find,
        };

        return this.find(filter as any, options);
    }
}
