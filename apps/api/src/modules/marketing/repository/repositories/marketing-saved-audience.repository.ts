import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { MarketingSavedAudienceEntity } from '../entities/marketing-saved-audience.entity';

@Injectable()
export class MarketingSavedAudienceRepository extends DatabaseRepository<MarketingSavedAudienceEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingSavedAudienceEntity);
    }
}
