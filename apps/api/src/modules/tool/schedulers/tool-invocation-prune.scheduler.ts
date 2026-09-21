import { ContextualCron } from '@app/common/database/decorators/contextual-cron.decorator';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ToolInvocationEntity } from 'src/modules/tool/repository/entities/tool-invocation.entity';

const RETENTION_DAYS = 30;

/**
 * Runs daily at 03:00 server time. Hard-deletes ToolInvocation rows older than
 * RETENTION_DAYS via nativeDelete — the entity deliberately opts out of soft
 * delete because it is an audit log; the prune is the point. Bounds table
 * growth and keeps the operator-facing invocation viewer responsive without
 * manual cleanup.
 */
@Injectable()
export class ToolInvocationPruneScheduler {
    private readonly logger = new Logger(ToolInvocationPruneScheduler.name);

    constructor(private readonly em: EntityManager) {}

    @ContextualCron(CronExpression.EVERY_DAY_AT_3AM)
    async prune(): Promise<void> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
        // @ContextualCron already runs this inside a fresh EM fork; nativeDelete
        // is set-based and never touches the identity map, so no manual fork.
        const result = await this.em.nativeDelete(ToolInvocationEntity, {
            createdAt: { $lt: cutoff },
        });
        this.logger.log(
            `Pruned ${result} ToolInvocation rows older than ${RETENTION_DAYS} days`
        );
    }
}
