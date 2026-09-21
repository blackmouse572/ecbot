import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { DatabaseRepository } from 'src/common/database/bases/database.repository';
import { WaitlistEntity } from 'src/modules/waitlist/repository/entities/waitlist.entity';

@Injectable()
export class WaitlistRepository extends DatabaseRepository<WaitlistEntity> {
    constructor(em: EntityManager) {
        // No audit relations to populate — entries are created anonymously.
        super(em, WaitlistEntity, []);
    }
}
