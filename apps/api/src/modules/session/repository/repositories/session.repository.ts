import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';

@Injectable()
export class SessionRepository extends DatabaseRepository<SessionEntity> {
    constructor(em: EntityManager) {
        super(em, SessionEntity);
    }
}
