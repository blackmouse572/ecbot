import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { IDatabaseFindAllOptions } from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomerTagEntity } from '../entities/customer-tag.entity';

@Injectable()
export class CustomerTagRepository extends DatabaseRepository<CustomerTagEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerTagEntity);
    }

    async findByWorkspace(
        workspaceId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<CustomerTagEntity[]> {
        const filter: Record<string, any> = {
            workspace: workspaceId,
            deletedAt: null,
            ...find,
        };

        return this.find(filter as any, options);
    }
}
