import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

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

        // Audit impersonation sessions that expired without a clean "end" call
        // (tab closed) before they get swept below.
        const expiredImpersonations = await this.orm.em.find(SessionEntity, {
            status: ENUM_SESSION_STATUS.ACTIVE,
            impersonatedBy: { $ne: null },
            expiredAt: { $lt: now },
        });
        for (const session of expiredImpersonations) {
            // A failed audit write must not block the bulk revoke below.
            try {
                await this.activityService.createByAdmin(
                    this.orm.em.getReference(UserEntity, session.user.id),
                    session.impersonatedBy!,
                    {
                        action: ENUM_ACTIVITY_ACTION.IMPERSONATE_END,
                        subject: ENUM_POLICY_SUBJECT.USER,
                        metadata: {
                            session: session.id,
                            reason: 'expired_swept',
                        },
                    }
                );
            } catch (err) {
                this.logger.error(
                    `Failed to audit expired impersonation session [${session.id}]: ${(err as Error)?.message}`
                );
            }
        }

        await this.orm.em.nativeUpdate(
            SessionEntity,
            { status: ENUM_SESSION_STATUS.ACTIVE, expiredAt: { $lt: now } },
            { status: ENUM_SESSION_STATUS.REVOKED, revokeAt: now }
        );
    }
}
