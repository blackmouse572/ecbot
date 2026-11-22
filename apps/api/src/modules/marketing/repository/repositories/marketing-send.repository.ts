import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { MarketingSendEntity } from '../entities/marketing-send.entity';

@Injectable()
export class MarketingSendRepository extends DatabaseRepository<MarketingSendEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingSendEntity);
    }
}
