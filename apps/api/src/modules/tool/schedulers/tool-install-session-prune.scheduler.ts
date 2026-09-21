import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';

/**
 * Runs every 15 minutes. Hard-deletes expired ToolInstallSession rows
 * (where expiresAt < NOW()). Sessions are short-lived OAuth state; the
 * prune keeps the table small without operator intervention.
 */
@Injectable()
export class ToolInstallSessionPruneScheduler {
    private readonly logger = new Logger(ToolInstallSessionPruneScheduler.name);

    constructor(private readonly em: EntityManager) {}

    @ContextualCron('0 */15 * * * *')
    async prune(): Promise<void> {
        const now = new Date();
        // @ContextualCron already runs this inside a fresh EM fork; nativeDelete
        // is set-based and never touches the identity map, so no manual fork.
        const result = await this.em.nativeDelete(ToolInstallSessionEntity, {
            expiresAt: { $lt: now },
            deleted: false,
        });
        this.logger.log(`Pruned ${result} expired ToolInstallSession rows`);
    }
}
