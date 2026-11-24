import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import {
    REPLY_MISSED_MAX_PER_RUN,
    REPLY_MISSED_MIN_AGE_SECONDS,
    REPLY_MISSED_WINDOW_SECONDS,
} from '../constants/reply-missed.constant';
import { ReplyMissedAlertService } from '../services/reply-missed-alert.service';

/**
 * Backstop for reply turns that never ran (Cloud Task lost, process died
 * mid-turn, retries exhausted). The turn hook catches turns that reported
 * `failed`; only a query over the rows sees the rest.
 *
 * A cron, not a Cloud Task: it is a read over two indexed timestamps plus a
 * few NOT EXISTS probes, and a per-minute task would cost more than it saves
 * (same reasoning as InboundReconciliationScheduler).
 */
@Injectable()
export class ReplyMissedScheduler {
    private readonly logger = new Logger(ReplyMissedScheduler.name);

    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly alert: ReplyMissedAlertService,
        // Read by @ContextualCron for the per-run EntityManager fork.
        private readonly orm: MikroORM
    ) {}

    @ContextualCron(CronExpression.EVERY_MINUTE)
    async sweep(): Promise<void> {
        const now = Date.now();
        const olderThan = new Date(now - REPLY_MISSED_MIN_AGE_SECONDS * 1000);
        const newerThan = new Date(now - REPLY_MISSED_WINDOW_SECONDS * 1000);

        const rows = await this.messageRepository.findUnansweredInbound(
            newerThan,
            olderThan,
            REPLY_MISSED_MAX_PER_RUN
        );
        // The common case, and not worth a log line a minute.
        if (rows.length === 0) return;

        const alerted = await this.alert.reportSweepMisses(rows);
        this.logger.log(
            `reply-missed sweep: ${rows.length} unanswered, ${alerted} alerted`
        );
    }
}
