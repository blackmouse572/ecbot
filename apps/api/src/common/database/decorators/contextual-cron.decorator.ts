import { CreateRequestContext } from '@mikro-orm/core';
import { applyDecorators } from '@nestjs/common';
import { Cron, CronOptions } from '@nestjs/schedule';

/**
 * `@Cron` for scheduler methods that touch the database — the symmetric seam to
 * {@link ContextualWorkerHost}. A cron fires outside any HTTP request, so
 * without a context its ORM work leaks into the never-cleared global
 * EntityManager identity map (see contextual-worker-host.ts). This fuses
 * `@Cron` with a fresh per-invocation EntityManager fork so a scheduler can't
 * be wired without one.
 *
 * The host class must expose the ORM to `@CreateRequestContext` — either an
 * `orm: MikroORM` or an `em: EntityManager` property (constructor-injected).
 *
 * Decorator order is load-bearing: `CreateRequestContext` runs first and swaps
 * `descriptor.value` for the context-wrapping method; `Cron` then attaches its
 * `SCHEDULE_CRON_OPTIONS` metadata to that wrapper. Reversed, the metadata would
 * land on the unwrapped function and the job would never be scheduled.
 */
export function ContextualCron(
    cronTime: string | Date,
    options?: CronOptions
): MethodDecorator {
    return applyDecorators(CreateRequestContext(), Cron(cronTime, options));
}
