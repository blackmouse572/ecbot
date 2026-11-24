import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_MARKETING_SEND_MODE } from '../../enums/marketing-send.enum';
import { MarketingSendEntity } from '../entities/marketing-send.entity';

@Injectable()
export class MarketingSendRepository extends DatabaseRepository<MarketingSendEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingSendEntity);
    }

    /** AUTO sends still on that have not run on this shop day. */
    findDueAuto(today: string): Promise<MarketingSendEntity[]> {
        return this.em.find(
            MarketingSendEntity,
            {
                mode: ENUM_MARKETING_SEND_MODE.AUTO,
                active: true,
                $or: [{ lastRunDay: null }, { lastRunDay: { $lt: today } }],
            },
            { orderBy: { createdAt: 'asc' } }
        );
    }

    /**
     * Marks the send as run on `day`; false when another run already took
     * that day, so two app instances never run it twice.
     */
    async claimRun(id: string, day: string): Promise<boolean> {
        const changed = await this.em.nativeUpdate(
            MarketingSendEntity,
            {
                id,
                $or: [{ lastRunDay: null }, { lastRunDay: { $lt: day } }],
            },
            { lastRunDay: day }
        );
        return changed > 0;
    }
}
