import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { MarketingBackfillRunEntity } from '../entities/marketing-backfill-run.entity';

@Injectable()
export class MarketingBackfillRunRepository extends DatabaseRepository<MarketingBackfillRunEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingBackfillRunEntity);
    }
}
