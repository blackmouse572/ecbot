import {
    AI_USAGE_METER,
    AiUsageMeter,
} from '@app/app/ai-usage-meter.interface';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    CUSTOMER_MARKETING_BACKFILL_BATCH_SIZE,
    CUSTOMER_MARKETING_BACKFILL_DAYS,
    CUSTOMER_MARKETING_BACKFILL_QUEUE,
    CUSTOMER_MARKETING_BACKFILL_STALE_MS,
    CUSTOMER_MARKETING_BACKFILL_TOKEN_SHARE,
    CUSTOMER_MARKETING_BACKFILL_UNITS_PER_CONVERSATION,
    ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS,
} from '../constants/customer-marketing-backfill.constant';
import { MarketingBackfillGetResponseDto } from '../dtos/response/marketing-backfill.get.response.dto';
import { ENUM_MARKETING_BACKFILL_STATUS } from '../enums/customer-marketing.enum';
import { MarketingBackfillRunEntity } from '../repository/entities/marketing-backfill-run.entity';
import { MarketingBackfillRunRepository } from '../repository/repositories/marketing-backfill-run.repository';
import { CustomerTagClassifierTaskService } from './customer-tag-classifier-task.service';

const DAY_MS = 86_400_000;

/**
 * Fills the marketing labels from a workspace's last 90 days of
 * conversations, once (#500). Runs as a chain of Cloud Tasks, one batch of
 * conversations each, newest first, and stops before it spends more than
 * 30% of the tokens left when it started. Starting it again resumes.
 */
@Injectable()
export class CustomerMarketingBackfillService {
    private readonly logger = new Logger(CustomerMarketingBackfillService.name);

    constructor(
        private readonly runRepository: MarketingBackfillRunRepository,
        private readonly conversationRepository: ConversationRepository,
        private readonly classifierTaskService: CustomerTagClassifierTaskService,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        @Optional()
        @Inject(AI_USAGE_METER)
        private readonly meter?: AiUsageMeter
    ) {}

    getRun(workspaceId: string): Promise<MarketingBackfillRunEntity | null> {
        return this.runRepository.findOne({ workspace: workspaceId });
    }

    /**
     * Starts the run, or resumes one stopped at its token cap (or stalled).
     * A running or finished run is returned as it is.
     */
    async start(
        workspaceId: string,
        userId: string
    ): Promise<MarketingBackfillRunEntity> {
        const existing = await this.getRun(workspaceId);
        if (existing && !this.canStartAgain(existing)) return existing;

        const run = existing ?? new MarketingBackfillRunEntity();
        if (!existing) {
            const em = this.runRepository.getEntityManager();
            run.workspace = em.getReference(WorkspaceEntity, workspaceId);
            run.createdBy = em.getReference(UserEntity, userId);
            run.since = new Date(
                Date.now() - CUSTOMER_MARKETING_BACKFILL_DAYS * DAY_MS
            );
            run.total =
                await this.conversationRepository.countForMarketingBackfill(
                    workspaceId,
                    run.since
                );
        }
        const remaining = await this.tokensLeft(workspaceId);
        run.budgetStart = remaining ?? null;
        run.budgetFloor =
            remaining === undefined
                ? null
                : Math.floor(
                      remaining * (1 - CUSTOMER_MARKETING_BACKFILL_TOKEN_SHARE)
                  );
        run.processedAtStart = run.processed;
        run.status = ENUM_MARKETING_BACKFILL_STATUS.RUNNING;
        run.finishedAt = null;
        await this.runRepository.save(run);
        await this.enqueue(run, `start-${Date.now()}`);
        return run;
    }

    /** One task: classify the next batch, then queue the one after. */
    async runBatch(runId: string): Promise<void> {
        const run = await this.runRepository.findOneById(runId);
        if (!run || run.status !== ENUM_MARKETING_BACKFILL_STATUS.RUNNING) {
            return;
        }
        const workspaceId = run.workspace.id;

        if (await this.overBudget(run, workspaceId)) {
            run.status = ENUM_MARKETING_BACKFILL_STATUS.STOPPED_BUDGET;
            await this.runRepository.save(run);
            this.logger.log(
                `marketing backfill stopped at its token cap workspace=${workspaceId} processed=${run.processed}/${run.total}`
            );
            return;
        }

        const batch =
            await this.conversationRepository.findForMarketingBackfill(
                workspaceId,
                run.since,
                run.cursorAt && run.cursorId
                    ? { at: run.cursorAt, id: run.cursorId }
                    : null,
                CUSTOMER_MARKETING_BACKFILL_BATCH_SIZE
            );
        await Promise.all(
            batch.map(conversation =>
                this.classifierTaskService
                    .classifyMarketing(conversation.id, run.since)
                    .catch((error: unknown) =>
                        this.logger.warn(
                            `marketing backfill skipped conversation ${conversation.id}: ${(error as Error).message}`
                        )
                    )
            )
        );

        const last = batch[batch.length - 1];
        if (last) {
            run.cursorAt = last.lastMessageAt ?? null;
            run.cursorId = last.id;
            run.processed += batch.length;
        }
        if (batch.length < CUSTOMER_MARKETING_BACKFILL_BATCH_SIZE) {
            run.status = ENUM_MARKETING_BACKFILL_STATUS.DONE;
            run.finishedAt = new Date();
        }
        await this.runRepository.save(run);
        if (run.status === ENUM_MARKETING_BACKFILL_STATUS.RUNNING) {
            await this.enqueue(run, String(run.processed));
        }
    }

    mapGet(
        run: MarketingBackfillRunEntity | null
    ): MarketingBackfillGetResponseDto {
        return plainToInstance(
            MarketingBackfillGetResponseDto,
            run
                ? {
                      ...run,
                      startedAt: run.createdAt,
                      stalled:
                          run.status ===
                              ENUM_MARKETING_BACKFILL_STATUS.RUNNING &&
                          this.canStartAgain(run),
                  }
                : { status: ENUM_MARKETING_BACKFILL_STATUS.NOT_STARTED },
            { excludeExtraneousValues: true }
        );
    }

    private canStartAgain(run: MarketingBackfillRunEntity): boolean {
        if (run.status === ENUM_MARKETING_BACKFILL_STATUS.STOPPED_BUDGET) {
            return true;
        }
        const lastProgress = (run.updatedAt ?? run.createdAt).getTime();
        return (
            run.status === ENUM_MARKETING_BACKFILL_STATUS.RUNNING &&
            Date.now() - lastProgress > CUSTOMER_MARKETING_BACKFILL_STALE_MS
        );
    }

    // Stops when the meter blocks, or when the next batch could take the
    // tokens left below the floor. The cost per conversation is measured
    // from this run; anything else spent meanwhile counts too, so it stops
    // early rather than late.
    private async overBudget(
        run: MarketingBackfillRunEntity,
        workspaceId: string
    ): Promise<boolean> {
        if (!this.meter) return false;
        const decision = await this.meter.check(workspaceId);
        if (!decision.allowed) return true;
        if (run.budgetFloor == null || decision.remaining === undefined) {
            return false;
        }
        const done = run.processed - run.processedAtStart;
        const perConversation =
            done > 0 && run.budgetStart != null
                ? Math.max(0, run.budgetStart - decision.remaining) / done
                : CUSTOMER_MARKETING_BACKFILL_UNITS_PER_CONVERSATION;
        const next = perConversation * CUSTOMER_MARKETING_BACKFILL_BATCH_SIZE;
        return decision.remaining - next < run.budgetFloor;
    }

    private async tokensLeft(workspaceId: string): Promise<number | undefined> {
        if (!this.meter) return undefined;
        return (await this.meter.check(workspaceId)).remaining;
    }

    // Named per batch, so a retried enqueue never queues the same batch
    // twice. A start or resume gets its own name: the name of a task that
    // already ran cannot be used again.
    private enqueue(
        run: MarketingBackfillRunEntity,
        step: string
    ): Promise<void> {
        return this.cloudTasksClient.enqueue(
            CUSTOMER_MARKETING_BACKFILL_QUEUE,
            ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS.BATCH,
            { runId: run.id },
            { taskName: `marketing-backfill-${run.id}-${step}` }
        );
    }
}
