import { DATABASE_AUDIT_POPULATE } from 'src/common/database/constants/database.constant';
import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ClientCredentialEntity } from 'src/modules/client-credential/repository/entities/client-credential.entity';

@Injectable()
export class ClientCredentialRepository extends DatabaseRepository<ClientCredentialEntity> {
    constructor(em: EntityManager) {
        super(em, ClientCredentialEntity, DATABASE_AUDIT_POPULATE);
    }
}
