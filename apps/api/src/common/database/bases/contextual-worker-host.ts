import { CreateRequestContext, MikroORM } from '@mikro-orm/core';
import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

/**
 * Base class for every BullMQ processor that touches the database.
 *
 * A BullMQ job runs outside the HTTP request context, so it has no per-request
 * `EntityManager` fork. Without one, all ORM work falls back to the single
 * global EntityManager whose identity map is never cleared — every entity a job
 * loads or persists (plus its populated graph) is retained for the whole
 * process lifetime. Under steady traffic that grows monotonically until OOM.
 *
 * Extending this base makes "run inside a fresh, disposable EntityManager fork,
 * discarded when the job completes" a property of the seam every processor
 * crosses — not an honour-system decorator each author must remember. Subclasses
 * implement `handle()`; `process()` is final and owns the context.
 *
 * @see contextual-cron.decorator.ts — the symmetric seam for cron schedulers.
 */
export abstract class ContextualWorkerHost extends WorkerHost {
    protected constructor(protected readonly orm: MikroORM) {
        super();

        // TypeScript has no `final`. A subclass that overrides process() would
        // silently skip the @CreateRequestContext seam and reintroduce the leak.
        // Fail loudly at construction (boot) instead.
        if (this.process !== ContextualWorkerHost.prototype.process) {
            throw new Error(
                `${this.constructor.name} overrides process(), which skips the ` +
                    `per-job EntityManager fork. Implement handle() instead.`
            );
        }
    }

    /**
     * Forks a fresh EntityManager for this job (via `this.orm`) and runs
     * `handle()` inside its RequestContext. The fork — and its identity map —
     * is discarded when `handle()` settles. Do not override; put job logic in
     * `handle()`.
     */
    @CreateRequestContext()
    async process(job: Job, token?: string): Promise<unknown> {
        return this.handle(job, token);
    }

    abstract handle(job: Job, token?: string): Promise<unknown>;
}
