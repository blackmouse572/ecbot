import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

interface IRevokedSessionRow {
    id: string;
    user_id: string;
    impersonated_by: string | null;
}

@Injectable()
export class SessionRevokeSweepScheduler {
    private readonly logger = new Logger(SessionRevokeSweepScheduler.name);

    constructor(
        private readonly orm: MikroORM,
        private readonly activityService: ActivityService
    ) {}

    @ContextualCron(CronExpression.EVERY_HOUR)
    async sweep(): Promise<void> {
        const now = new Date();

        // One statement revokes every expired session and hands back exactly the
        // rows *this* run changed. Auditing from that result (instead of a
        // separate find) means two API instances, or a manual end landing
        // mid-sweep, can never write an end record for the same session twice.
        const revoked = await this.orm.em
            .getConnection()
            .execute<IRevokedSessionRow[]>(
                `update sessions
                    set status = ?, revoke_at = ?
                  where status = ? and expired_at < ?
              returning id, user_id, impersonated_by`,
                [
                    ENUM_SESSION_STATUS.REVOKED,
                    now,
                    ENUM_SESSION_STATUS.ACTIVE,
                    now,
                ]
            );

        // Impersonation sessions that expired without a clean end (tab closed).
        for (const row of revoked.filter(r => r.impersonated_by)) {
            // A failed audit write must not abort the rest of the sweep.
            try {
                await this.activityService.createByAdmin(
                    this.orm.em.getReference(UserEntity, row.user_id),
                    row.impersonated_by!,
                    {
                        action: ENUM_ACTIVITY_ACTION.IMPERSONATE_END,
                        subject: ENUM_POLICY_SUBJECT.USER,
                        metadata: {
                            session: row.id,
                            reason: 'expired_swept',
                        },
                    }
                );
            } catch (err) {
                this.logger.error(
                    `Failed to audit expired impersonation session [${row.id}]: ${(err as Error)?.message}`
                );
            }
        }
    }
}
