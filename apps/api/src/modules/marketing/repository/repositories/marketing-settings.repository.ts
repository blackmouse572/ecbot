import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { MarketingSettingsEntity } from '../entities/marketing-settings.entity';

@Injectable()
export class MarketingSettingsRepository extends DatabaseRepository<MarketingSettingsEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingSettingsEntity);
    }
}
