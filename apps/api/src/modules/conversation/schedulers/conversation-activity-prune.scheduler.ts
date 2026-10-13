import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { CONVERSATION_ACTIVITY_RETENTION_DAYS } from '../constants/conversation-activity.constant';
import { ConversationActivityRepository } from '../repository/repositories/conversation-activity.repository';

/**
 * Hard-deletes conversation activities older than the retention, daily at
 * 03:00 like ToolInvocationPruneScheduler, so the trace's two halves age out
 * together.
 */
@Injectable()
export class ConversationActivityPruneScheduler {
    private readonly logger = new Logger(
        ConversationActivityPruneScheduler.name
    );

    constructor(
        private readonly repository: ConversationActivityRepository,
        // Read by @ContextualCron for the per-run EntityManager fork.
        private readonly orm: MikroORM
    ) {}

    @ContextualCron(CronExpression.EVERY_DAY_AT_3AM)
    async prune(): Promise<void> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - CONVERSATION_ACTIVITY_RETENTION_DAYS);
        const result = await this.repository.deleteOlderThan(cutoff);
        this.logger.log(
            `Pruned ${result} conversation activities older than ${CONVERSATION_ACTIVITY_RETENTION_DAYS} days`
        );
    }
}
