import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class RoleRepository extends DatabaseRepository<RoleEntity> {
    constructor(em: EntityManager) {
        super(em, RoleEntity);
    }
}
