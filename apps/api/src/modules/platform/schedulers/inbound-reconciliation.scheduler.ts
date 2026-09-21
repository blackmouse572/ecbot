import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { RECONCILE_LOOKBACK_SECONDS } from '../constants/inbound-reconciliation.constant';
import { InboundInboxService } from '../services/inbound-inbox.service';
import { PlatformAdapterRegistry } from '../services/platform-adapter.registry';

@Injectable()
export class InboundReconciliationScheduler {
    private readonly logger = new Logger(InboundReconciliationScheduler.name);

    constructor(
        private readonly accountRepository: AccountRepository,
        private readonly registry: PlatformAdapterRegistry,
        private readonly inbox: InboundInboxService,
        private readonly orm: MikroORM
    ) {}

    @ContextualCron(CronExpression.EVERY_HOUR)
    async handleReconcile(): Promise<void> {
        const lookback = new Date(
            Date.now() - RECONCILE_LOOKBACK_SECONDS * 1000
        );
        const accounts = await this.accountRepository.findAllActive();

        this.logger.log(
            `Reconciliation sweep: ${accounts.length} accounts, lookback=${lookback.toISOString()}`
        );

        for (const account of accounts) {
            if (!this.registry.has(account.type)) continue;
            const adapter = this.registry.get(account.type);
            if (!adapter.reconcile) continue;

            try {
                const events = await adapter.reconcile(account, lookback);
                this.logger.debug(
                    `account=${account.id} type=${account.type} events=${events.length}`
                );
                for (const event of events) {
                    try {
                        await this.inbox.accept(account.type, event);
                    } catch (err) {
                        this.logger.error(
                            `accept failed mid=${event.externalMessageId}: ${(err as Error).message}`
                        );
                    }
                }
            } catch (err) {
                this.logger.warn(
                    `reconcile failed account=${account.id}: ${(err as Error).message}`
                );
            }
        }
    }
}
