import { DATABASE_AUDIT_POPULATE } from 'src/common/database/constants/database.constant';
import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';

@Injectable()
export class ApiKeyRepository extends DatabaseRepository<ApiKeyEntity> {
    constructor(em: EntityManager) {
        super(em, ApiKeyEntity, DATABASE_AUDIT_POPULATE);
    }
}
