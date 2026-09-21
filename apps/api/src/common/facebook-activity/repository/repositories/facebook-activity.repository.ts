import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { FacebookActivityEntity } from '../entities/facebook-activity.entity';

@Injectable()
export class FacebookActivityRepository extends DatabaseRepository<FacebookActivityEntity> {
    constructor(em: EntityManager) {
        super(em, FacebookActivityEntity);
    }
}
