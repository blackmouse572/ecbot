import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { MarketingSendService } from '../services/marketing-send.service';

/**
 * Hourly: runs each "Tự gửi mỗi ngày" send once a shop day, in the first
 * hour its shop's send hours are open (#506).
 */
@Injectable()
export class MarketingAutoSendScheduler {
    constructor(
        // @ContextualCron forks this per run.
        private readonly em: EntityManager,
        private readonly sendService: MarketingSendService
    ) {}

    @ContextualCron(CronExpression.EVERY_HOUR)
    run(): Promise<void> {
        return this.sendService.runDueAuto();
    }
}
