import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { MikroORM } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';

@Injectable()
export class SessionRevokeSweepScheduler {
    constructor(private readonly orm: MikroORM) {}

    @ContextualCron(CronExpression.EVERY_HOUR)
    async sweep(): Promise<void> {
        const now = new Date();
        await this.orm.em.nativeUpdate(
            SessionEntity,
            { status: ENUM_SESSION_STATUS.ACTIVE, expiredAt: { $lt: now } },
            { status: ENUM_SESSION_STATUS.REVOKED, revokeAt: now }
        );
    }
}
