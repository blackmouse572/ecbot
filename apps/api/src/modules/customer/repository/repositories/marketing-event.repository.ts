import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { MarketingEventEntity } from '../entities/marketing-event.entity';

@Injectable()
export class MarketingEventRepository extends DatabaseRepository<MarketingEventEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingEventEntity);
    }
}
